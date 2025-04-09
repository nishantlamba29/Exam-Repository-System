const fs = require("fs");
const path = require("path");
const HttpError = require("../Utils/HttpError");
const Question = require("../Models/Question");
const Paper = require("../Models/Paper");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyAFI6MEaFZ39EAoV99iFmQVJU3CCZlDku8");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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

    // Send the file to Gemini for processing
    const image = req.file.buffer.toString("base64");
    const parts = [
      {
        text: "Extract the questions from the exam paper exactly as they appear and provide a concise outline of the answers, focusing on key concepts. Output the data as a JSON array, where each object contains the question, a brief answer outline, and a relevant tag. If the text is unreadable or inappropriate, return a plain string indicating the content is unclear or invalid.",
      },
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: image,
        },
      },
    ];

    const result = await model.generateContent({ contents: [{ parts }] });
    const text = result.response.text();
    const questionsAndAnswers = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)[1]);

    // For each QA pair, compute the vector embedding
    const questionsWithEmbeddings = await Promise.all(
      questionsAndAnswers.map(async (item) => {
        const vector = await getVectorEmbedding(`${item.question} ${item.answer_outline}`);
        return {
          question: item.question,
          answer: item.answer_outline,
          tag: item.tag,
          embedding: vector,
        };
      })
    );

    // Save the paper and extracted data (with vectors) to the database
    const paper = new Paper({
      title: req.body.title || req.file.originalname,
      filePath: `/uploads/${req.file.originalname}`,
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
    // Query the Paper model instead of Question
    const papers = await Paper.find();
    const formattedPapers = papers.map((paper) => ({
      _id: paper._id,
      title: paper.title,
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

exports.UploadPaper = UploadPaper;
exports.GetQuestion = GetQuestion;
exports.GetPapers = GetPapers;
