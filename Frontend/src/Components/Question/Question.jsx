import React, { useState, useEffect, useContext } from "react";
import AuthContext from "../../Context/AuthContext";
import "./Question.css";

const QuestionList = () => {
  const auth = useContext(AuthContext);
  const [papers, setPapers] = useState([]);
  const [selectedPaper, setSelectedPaper] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/getPapers") // Update the endpoint to fetch papers
      .then((res) => res.json())
      .then((data) => setPapers(data))
      .catch((error) => console.error("Error fetching papers:", error));
  }, []);

  const handlePaperClick = (paper) => {
    setSelectedPaper(paper);

    // Update browsed courses for the user by calling the update endpoint
    fetch("http://localhost:8000/updateBrowsedCourse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + auth.token,
      },
      body: JSON.stringify({ course: paper.course }),
    })
      .then((res) => res.json())
      .then((data) =>
        console.log("User browsed courses updated:", data)
      )
      .catch((error) =>
        console.error("Error updating browsed courses:", error)
      );
  };

  const handleClose = () => {
    setSelectedPaper(null);
  };

  return (
    <div className="w-full p-6 mx-auto mt-16 bg-gray-900 text-white shadow-2xl border border-gray-700">
      {!selectedPaper ? (
        <div>
          <h2 className="text-2xl font-bold mb-4">Uploaded Papers</h2>
          <ul className="space-y-4">
            {papers.map((paper) => (
              <li
                key={paper._id}
                className="p-5 bg-gray-800 border border-gray-700 rounded-xl shadow-lg hover:shadow-xl transition duration-300 cursor-pointer"
                onClick={() => handlePaperClick(paper)}
              >
                <h3 className="text-lg font-bold">{paper.title}</h3>
                <p className="text-sm text-gray-400">Uploaded on: {new Date(paper.createdAt).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex">
          {/* Left Side: Paper */}
          <div className="w-1/2 p-4 bg-gray-800 border-r border-gray-700">
            <h3 className="text-lg font-bold mb-4">{selectedPaper.title}</h3>
            <iframe
              src={`http://localhost:8000${selectedPaper.filePath}`}
              title="Paper"
              className="w-full h-[80vh] border border-gray-600"
            ></iframe>
          </div>

          {/* Right Side: Questions and Answers */}
          <div className="w-1/2 p-4 bg-gray-800">
            <h3 className="text-lg font-bold mb-4">Questions and Answers</h3>
            <ul className="space-y-4">
              {selectedPaper.questions.map((qa, index) => (
                <li
                  key={index}
                  className="p-4 bg-gray-700 border border-gray-600 rounded-lg shadow-md"
                >
                  <h4 className="font-bold">Q{index + 1}: {qa.question}</h4>
                  <p className="mt-2 text-gray-300">{qa.answer}</p>
                  {qa.tag && <p className="mt-1 text-sm text-gray-400">Tag: {qa.tag}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {selectedPaper && (
        <button
          onClick={handleClose}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Papers
        </button>
      )}
    </div>
  );
};

export default QuestionList;
