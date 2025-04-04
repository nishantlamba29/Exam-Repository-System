const HttpError = require("../Utils/HttpError");
const Question = require("../Models/Question");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyAFI6MEaFZ39EAoV99iFmQVJU3CCZlDku8");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const Upload = async (req, res, next) => {
  try {
    console.log(req.file, req.userData);

    const image = req.file.buffer.toString("base64");

    const parts = [
      {
        text: "Extract the questions from the exam paper exactly as they appear and provide a concise outline of the answers, focusing on key concepts. Output the data as a JSON array, where each object contains the question, a brief answer outline, a relevant tag (e.g., science, history, mathematics), and a topic (e.g., algebra, world war, thermodynamics). If the text is unreadable or inappropriate, return a plain string indicating the content is unclear or invalid. Output should only be  and array of object  not any additional word as data have to saved",
      },
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: image,
        },
      },
    ];

    const result = await model.generateContent({ contents: [{ parts }] });
    const text =  result.response.text(); 

    const jsonData = JSON.parse(text.match(/```json\n([\s\S]*?)\n```/)[1]);

    const formattedData = jsonData.map((item) => ({
      Question: item.question,
      Answer: item.answer_outline,
      Tag: item.tag,
      Title: item.topic,

    }));
    await Question.insertMany(formattedData);
    console.log("Data inserted successfully!");
    res.json({ result: "success" });
  } catch (error) {
    console.error("Error generating content:", error);
    res.status(500).json({ error: error.message });
  }
};

const GetQuestion  = async( req , res , next )=>{
     try{
      const data  = await Question.find();
       res.json ( data);
     }catch{
      console.log( error);
      res.status ( 403);
      res.json( {"Message" : " Error occured"});

     }
}

exports.Upload = Upload;
exports.GetQuestion = GetQuestion
