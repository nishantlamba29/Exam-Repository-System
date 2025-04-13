import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import AuthContext from "../../Context/AuthContext";
import axios from "axios";

const PaperPage = () => {
  const { id } = useParams(); // Get paper ID from route
  const auth = useContext(AuthContext);
  const [paper, setPaper] = useState(null);

  useEffect(() => {
    const id1 = id; // from useParams
  
    axios.post("http://localhost:8000/getPaperByID", { paperID: id1 })
      .then((res) => {
        setPaper(res.data.paper);
      })
      .catch((err) => console.error("Error fetching paper:", err));
  }, [id, auth.token]);

  if (!paper) return <div className="text-white p-4">Loading...</div>;

  return (
    <div className="flex p-6 bg-gray-900 text-white">
      {/* Left Side: Paper View */}
      <div className="w-1/2 p-4 bg-gray-800 border-r border-gray-700">
        <h3 className="text-lg font-bold mb-4">{paper.title}</h3>
        <iframe
          src={`http://localhost:8000${paper.filePath}`}
          title="Paper"
          className="w-full h-[80vh] border border-gray-600"
        ></iframe>
      </div>

      {/* Right Side: Questions and Answers */}
      <div className="w-1/2 p-4 bg-gray-800">
        <h3 className="text-lg font-bold mb-4">Questions and Answers</h3>
        <ul className="space-y-4">
          {paper.questions.map((qa, index) => (
            <li key={index} className="p-4 bg-gray-700 border border-gray-600 rounded-lg shadow-md">
              <h4 className="font-bold">Q{index + 1}: {qa.question}</h4>
              <p className="mt-2 text-gray-300">{qa.answer}</p>
              {qa.tag && <p className="mt-1 text-sm text-gray-400">Tag: {qa.tag}</p>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PaperPage;
