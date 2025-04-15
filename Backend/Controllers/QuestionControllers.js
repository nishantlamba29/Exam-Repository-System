const fs = require("fs");
const path = require("path");
const HttpError = require("../Utils/HttpError");
const Question = require("../Models/Question");
const Paper = require("../Models/Paper");
const User = require("../Models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const coursesData = require("../Data/courses.json");
const Course = require("../Models/Course");
const promptTemplate = require("../Data/prompt.json");

const GEMINI_KEY = process.env.GEMINI_KEY
const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro-exp-03-25" });

async function getVectorEmbedding(text) {
    // Dummy implementation: return a fixed-length dummy vector
    return Array.from({ length: 10 }, () => Math.random());
}

const UploadPaper = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Save the uploaded file to the server
    const uploadsDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    const filePath = path.join(uploadsDir, req.file.originalname);
    fs.writeFileSync(filePath, req.file.buffer);

    // Convert file buffer to base64 string
    const image = req.file.buffer.toString("base64");

    // New Gemini prompt for question-answer extraction with detailed structure
    const parts = [
      {
        text: JSON.stringify(promptTemplate, null, 2)
      },
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: image,
        },
      },
    ];

    const result = await model.generateContent({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
      },
    });
    const jsonResponse = result.response.text();
    console.log("Gemini raw response:", jsonResponse);

    const parsed = JSON.parse(jsonResponse);
    console.log("Parsed Gemini output:", parsed);

    if (!parsed.course) {
      console.error("Parsed output missing course information.");
      return res
        .status(400)
        .json({ message: "Course code could not be extracted from the paper" });
    }

    // Compute vector embeddings for each Q&A pair from the 'questions' array
    const questionsWithEmbeddings = await Promise.all(
      parsed.questions.map(async (item) => {
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
        return res.status(400).json({
          message: "No course found with the provided course code or course name",
        });
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
      return res.status(400).json({
        message: "A paper for the same course, session, and exam type already exists.",
      });
    }

    // Create the Paper using the new model with added fields
    const paper = new Paper({
      title: req.body.title || req.file.originalname,
      filePath: `/uploads/${req.file.originalname}`,
      course: courseObj._id,
      session: parsed.session,
      sessionYear: parsed.sessionYear,
      examType: parsed.examType,
      questions: questionsWithEmbeddings,
    });
    console.log("Paper to be saved:", paper);

    await paper.save();
    console.log("Paper saved successfully.");
    res.status(201).json({ message: "Paper uploaded successfully", paper });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: error.message });
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
