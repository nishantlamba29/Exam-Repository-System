const fs = require("fs");
const path = require("path");
const HttpError = require("../Utils/HttpError");
const Question = require("../Models/Question");
const Paper = require("../Models/Paper");
const User = require("../Models/User");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const coursesData = require("../Data/courses.json");
const Course = require("../Models/Course");

const genAI = new GoogleGenerativeAI("AIzaSyAFI6MEaFZ39EAoV99iFmQVJU3CCZlDku8");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    // Updated Gemini prompt: extract exam paper details including a course code for the paper and questions array
    const parts = [
      {
        text:
          "Extract details from the exam paper exactly as it appears. " +
          "Return a JSON output that contains two keys: 'course' and 'questions'. " +
          "The 'course' key should be a string with the course code (e.g., 'CSC306') associated with the entire exam paper. " +
          "The 'questions' key should be an array where each object contains a 'question', a brief 'answer_outline', and a relevant 'tag'. " +
          "If the paper is unreadable or invalid, return a plain string indicating so. " +
          "Output only a JSON object in a markdown code block.",
      },
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: image,
        },
      },
    ];

    const result = await model.generateContent({ contents: [{ parts }] });
    const textResponse = result.response.text();
    const parsed = JSON.parse(textResponse.match(/```json\n([\s\S]*?)\n```/)[1]);

    if (!parsed.course) {
      return res
        .status(400)
        .json({ message: "Course code could not be extracted from the paper" });
    }

    // Compute vector embeddings for each QA pair from the 'questions' array
    const questionsWithEmbeddings = await Promise.all(
      parsed.questions.map(async (item) => {
        const vector = await getVectorEmbedding(
          `${item.question} ${item.answer_outline}`
        );
        return {
          question: item.question,
          answer: item.answer_outline,
          tag: item.tag,
          embedding: vector,
        };
      })
    );

    // Create the Paper using the extracted course code
    const paper = new Paper({
      title: req.body.title || req.file.originalname,
      filePath: `/uploads/${req.file.originalname}`,
      course: parsed.course,
      questions: questionsWithEmbeddings,
    });

    await paper.save();
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
    const papers = await Paper.find();
    const formattedPapers = papers.map((paper) => ({
      _id: paper._id,
      title: paper.title,
      course: paper.course,
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

    // Extract enrolled course codes from populated enrolledCourses
    const enrolled = user.enrolledCourses.map((course) => course.code);
    console.log("User enrolled courses:", enrolled);

    // Compute frequency from browsedCourses and pick top 3.
    const freq = {};
    user.browsedCourses.forEach((course) => {
      freq[course] = (freq[course] || 0) + 1;
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
      papers = await Paper.find().sort({ createdAt: -1 }).limit(10);
    } else {
      papers = await Paper.find({ course: { $in: relevantCourses } }).sort({ createdAt: -1 });
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

exports.UploadPaper = UploadPaper;
exports.GetQuestion = GetQuestion;
exports.GetPapers = GetPapers;
exports.GetDashboard = GetDashboard;
exports.UpdateBrowsedCourse = UpdateBrowsedCourse;
