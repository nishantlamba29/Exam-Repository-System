const fs = require("fs");
const path = require("path");
const HttpError = require("../Utils/HttpError");
const Question = require("../Models/Question");
const Paper = require("../Models/Paper");
const User = require("../Models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager, GoogleAICacheManager } = require("@google/generative-ai/server");
const coursesData = require("../Data/courses.json");
const Course = require("../Models/Course");
const promptTemplate = require("../Data/prompt.json");
const answerPromptTemplate = require("../Data/answer_prompt.json");
const agenda = require("../Utils/Agenda");

const GEMINI_KEY = process.env.GEMINI_KEY
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const GEMINI_MODEL = "gemini-2.5-pro-exp-03-25";
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

async function getVectorEmbedding(text) {
  // Dummy implementation: return a fixed-length dummy vector
  return Array.from({ length: 10 }, () => Math.random());
}

function sanitizeJsonResponse(str) {
  // First remove all carriage returns and line feeds
  const noLines = str.replace(/[\r\n]+/g, '');

  // This regex finds any sequence of one or more backslashes
  // not followed by a valid escape character and
  // doubles the number of backslashes in that sequence.
  return noLines.replace(/(\\+)(?!["\\/bfnrtu])/g, (match, slashes) => slashes + slashes);
}

agenda.define("process uploaded paper", { concurrency: 1 }, async (job) => {
  const { filePath, originalname, mimetype, title, userId } = job.attrs.data;
  const user = await User.findById(userId);

  let uploadName = null;
  let cachedContentName = null;
  const fileManager = new GoogleAIFileManager(GEMINI_KEY);
  const cacheManager = new GoogleAICacheManager(GEMINI_KEY);

  try {
    console.log("Uploading file to Gemini File API...");
    const uploadResult = await fileManager.uploadFile(filePath, {
      mimeType: mimetype,
      displayName: originalname,
    });
    uploadName = uploadResult.file.name;
    console.log(`Uploaded file URI: ${uploadResult.file.uri}`);

    let currentModel;

    try {
      console.log("Creating Context Cache...");
      const cacheResult = await cacheManager.create({
        model: `models/${GEMINI_MODEL}`,
        contents: [
          {
            role: "user",
            parts: [
              {
                fileData: {
                  mimeType: uploadResult.file.mimeType,
                  fileUri: uploadResult.file.uri,
                },
              },
            ],
          },
        ],
        ttlSeconds: 60 * 15,
      });
      cachedContentName = cacheResult.name;
      console.log(`Cache successfully created: ${cachedContentName}`);
      currentModel = genAI.getGenerativeModelFromCachedContent(cacheResult);
    } catch (cacheError) {
      console.log("Context caching fallback triggered (usually due to input < 32k tokens). Using normal File API refs.");
      currentModel = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    }

    const { responseSchema: extractionSchema, responseMimeType: _rm, output_format: _of, ...extractionPromptText } = promptTemplate;
    const parts = [
      {
        text: JSON.stringify(extractionPromptText, null, 2)
      }
    ];

    if (!cachedContentName) {
      parts.push({
        fileData: {
          mimeType: uploadResult.file.mimeType,
          fileUri: uploadResult.file.uri,
        }
      });
    }

    const result = await currentModel.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
        temperature: 0.2
      },
    });
    const jsonResponse = result.response.text();
    console.log("Gemini raw response:", jsonResponse);

    const safeJson = sanitizeJsonResponse(jsonResponse);
    const parsed = JSON.parse(safeJson);
    console.log("Parsed Gemini output:", parsed);

    if (parsed.course.code === "-1" || parsed.session.toString() === "-1") {
      console.error("Parsed output missing course information.");
      if (user) {
        user.Credit -= 10;
        user.Notification.push({
          Message: `Your paper [${title || originalname}] has been rejected as it could not be identified as a valid exam paper. Please try again.`
        });
        await user.save();
      }
      return;
    }

    // Answering Phase - Iterate over questions to get detailed answers
    const questionsWithAnswers = [];
    for (let i = 0; i < parsed.questions.length; i++) {
      const item = parsed.questions[i];
      console.log(`Generating answer for question ${i + 1}/${parsed.questions.length}...`);

      try {
        const { responseSchema: answerSchema, responseMimeType: _arm, ...answerPromptText } = answerPromptTemplate;
        const answerParts = [
          {
            text: JSON.stringify(answerPromptText, null, 2) + `\n\nSpecific Question: ${item.question}`
          }
        ];

        if (!cachedContentName) {
          answerParts.push({
            fileData: {
              mimeType: uploadResult.file.mimeType,
              fileUri: uploadResult.file.uri,
            }
          });
        }

        const answerResult = await currentModel.generateContent({
          contents: [{ role: "user", parts: answerParts }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: answerSchema,
            temperature: 0.3
          },
        });

        const answerJsonResponse = answerResult.response.text();
        const safeAnswerJson = sanitizeJsonResponse(answerJsonResponse);
        const parsedAnswer = JSON.parse(safeAnswerJson);

        questionsWithAnswers.push({
          question: item.question,
          tag: item.tag,
          answer: parsedAnswer.answer || "Answer generation failed."
        });
        // Small delay to help mitigate rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`Failed to generate answer for question ${i + 1}:`, err);
        questionsWithAnswers.push({
          question: item.question,
          tag: item.tag,
          answer: "Failed to generate detailed answer for this question due to an error."
        });
      }
    }

    // Compute vector embeddings for each Q&A pair from the 'questionsWithAnswers' array
    const questionsWithEmbeddings = await Promise.all(
      questionsWithAnswers.map(async (item) => {
        const vector = await getVectorEmbedding(`${item.question} ${item.answer}`);
        return {
          question: item.question,
          answer: item.answer,
          tag: item.tag,
          embedding: vector,
        };
      })
    );

    // First, try to look up the course in the database using the extracted course code
    let courseObj = await Course.findOne({ code: parsed.course.code });
    console.log("Lookup by course code:", parsed.course.code, "=>", courseObj);

    // Fallback: if no course was found by code, search by the course name using a regex match
    if (!courseObj) {
      // Construct a case-insensitive regex that matches the start of the course name
      const nameRegex = new RegExp("^" + parsed.course.name, "i");
      courseObj = await Course.findOne({ name: { $regex: nameRegex } });
      console.log("Fallback lookup by course name regex:", parsed.course.name, "=>", courseObj);
      if (!courseObj) {
        console.error("No course found with the provided code or name.");
        if (user) {
          user.Credit -= 10;
          user.Notification.push({
            Message: `Your paper [${title || originalname}] has been rejected as it could not be matched with a valid course. Please try again.`
          });
          await user.save();
        }
        return;
      }
    }

    // Check if a paper with the same course, session, sessionYear, and examType already exists.
    const existingPaper = await Paper.findOne({
      course: courseObj._id,
      session: parsed.session,
      sessionYear: parsed.sessionYear,
      examType: parsed.examType,
    });
    if (existingPaper) {
      if (user) {
        user.Notification.push({
          Message: `Your paper [${title || originalname}] is already present in the database.`,
          paperId: existingPaper._id
        });
        await user.save();
      }
      return;
    }

    // Update the Paper using the new model with added fields
    const paper = new Paper({
      title: title || originalname,
      filePath: `/uploads/${originalname}`,
      course: courseObj._id,
      session: parsed.session,
      sessionYear: parsed.sessionYear,
      examType: parsed.examType,
      questions: questionsWithEmbeddings,
    });
    await paper.save();
    console.log("Paper updated successfully.");
    if (user) {
      user.Credit += 100;
      user.Notification.push({
        Message: `Your paper [${parsed.course.code}] ${parsed.course.name} (${parsed.examType}) has been approved!`,
        paperId: paper._id
      });
      await user.save();
    }
  } catch (err) {
    // On error, mark as rejected and notify user
    if (user) {
      user.Notification.push({
        Message: `Your paper [${title || originalname}] has been rejected due to error: ${err.message}. Please try again.`
      });
      await user.save();
    }
  } finally {
    if (cachedContentName) {
      console.log(`Cleaning up cache ${cachedContentName}...`);
      await cacheManager.delete(cachedContentName).catch(e => console.error("Cache cleanup error:", e));
    }
    if (uploadName) {
      console.log(`Cleaning up file ${uploadName}...`);
      await fileManager.deleteFile(uploadName).catch(e => console.error("File cleanup error:", e));
    }
  }
});

const UploadPaper = async (req, res, next) => {
  const user = await User.findById(req.userData.userId);
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Save the file to the uploads directory
    const filePath = path.join(__dirname, "../uploads", req.file.originalname);
    fs.writeFileSync(filePath, req.file.buffer);

    // Respond immediately to user
    res.status(202).json({ message: "Paper submitted for review. You will be notified once processing is complete." });

    // Schedule Agenda job in the background
    await agenda.now("process uploaded paper", {
      filePath,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      title: req.body.title,
      userId: req.userData.userId
    });
  } catch (error) {
    next(error);
  }
};

const GetQuestion = async (req, res, next) => {
  try {
    const data = await Question.find();
    res.json(data);
  } catch (error) {
    console.log(error);
    res.status(403);
    res.json({ Message: "Error occurred" });
  }
};

const GetPapers = async (req, res, next) => {
  try {
    // Populate the course reference to retrieve course code and name
    const papers = await Paper.find().populate("course");
    const formattedPapers = papers.map((paper) => ({
      _id: paper._id,
      title: paper.title,
      course: paper.course, // populated course details
      session: paper.session,
      sessionYear: paper.sessionYear,
      examType: paper.examType,
      createdAt: paper.createdAt,
      filePath: paper.filePath,
      questions: paper.questions,
    }));
    res.json(formattedPapers);
  } catch (error) {
    console.error("Error fetching papers:", error);
    res.status(500).json({ message: "Error fetching papers" });
  }
};

const GetDashboard = async (req, res, next) => {
  try {
    const userId = req.userData.userId;
    const user = await User.findById(userId)
      .populate("enrolledCourses")
      .populate("browsedCourses");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract enrolled course ObjectIds from populated enrolledCourses
    const enrolled = user.enrolledCourses.map((course) => course._id.toString());
    console.log("User enrolled courses:", enrolled);

    // Compute frequency from browsedCourses and pick top 3.
    const freq = {};
    user.browsedCourses.forEach((course) => {
      const id = course._id ? course._id.toString() : course.toString();
      freq[id] = (freq[id] || 0) + 1;
    });
    const topBrowsed = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((entry) => entry[0]);

    // Get union of enrolled and topBrowsed courses.
    const relevantCourses = [...new Set([...enrolled, ...topBrowsed])];
    console.log("Relevant courses:", relevantCourses);

    let papers;
    if (relevantCourses.length === 0) {
      // Fallback: return some recent papers if no relevant course is set.
      papers = await Paper.find().populate("course").sort({ createdAt: -1 }).limit(10);
    } else {
      papers = await Paper.find({ course: { $in: relevantCourses } })
        .populate("course")
        .sort({ createdAt: -1 });
    }
    res.json(papers);
  } catch (error) {
    console.error("Error in dashboard:", error);
    res.status(500).json({ message: error.message });
  }
};

const UpdateBrowsedCourse = async (req, res, next) => {
  try {
    const userId = req.userData.userId;
    const { course: courseCode } = req.body;
    if (!courseCode) {
      return res.status(400).json({ message: "Course code is required" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Look up the course from the database using the Course model
    const foundCourse = await Course.findOne({ code: courseCode });
    if (!foundCourse) {
      return res.status(400).json({ message: "No course found with the given code" });
    }

    // Add the course reference to browsedCourses if not already included
    if (!user.browsedCourses.some((c) => c.equals(foundCourse._id))) {
      user.browsedCourses.push(foundCourse._id);
    }
    await user.save();
    res.json({ message: "User browsed courses updated" });
  } catch (error) {
    console.error("Error updating browsed courses:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getPaperByID = async (req, res) => {
  try {
    console.log(req.body);
    const { paperID } = req.body;
    const paper = await Paper.findById(paperID).populate("course");
    if (!paper) {
      return res.status(403).json({
        success: false,
        message: "No paper found for the provided paper ID.",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Paper retrieved successfully.",
      paper,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "An error occurred while retrieving the paper.",
    });
  }
}
exports.UploadPaper = UploadPaper;
exports.GetQuestion = GetQuestion;
exports.GetPapers = GetPapers;
exports.GetDashboard = GetDashboard;
exports.UpdateBrowsedCourse = UpdateBrowsedCourse;
