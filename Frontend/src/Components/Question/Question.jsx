import React, { useState, useEffect, useContext } from "react";
import { FaSearch, FaEye, FaEyeSlash } from "react-icons/fa";
import AuthContext from "../../Context/AuthContext";
import "./Question.css";

const QuestionList = () => {
  const auth = useContext(AuthContext);
  const [questions, setQuestions] = useState([]);
  const [search, setSearch] = useState("");
  const [visibleAnswers, setVisibleAnswers] = useState({});

  useEffect(() => {
    fetch("http://localhost:8000/getQuestion")
      .then((res) => res.json())
      .then((data) => setQuestions(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  const toggleAnswerVisibility = (id) => {
    if (!visibleAnswers[id]) {
      if (auth.credit < 50) {
        alert("Low credit");
        return;
      }
      auth.updateCredit(auth.credit - 50);
    }
    setVisibleAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredQuestions = questions.filter(
    (q) =>
      q.Title.toLowerCase().includes(search.toLowerCase()) ||
      q.Tag.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full p-6 mx-auto mt-16 bg-gray-900 text-white shadow-2xl border border-gray-700  pb-15  ">
      <div className="relative mb-4">
        <FaSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search by title or tag..."
          className="w-full p-3 pl-10 bg-gray-800 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-md text-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ul className="space-y-4">
        {filteredQuestions.map((q) => (
          <li
            key={q._id}
            className="p-5 bg-gray-800 border border-gray-700 rounded-xl shadow-lg hover:shadow-xl transition duration-300"
          >
            <h3 className="text-lg font-normal  open-sans-google mb-3 ">
              {" "}
              {q.Question}
            </h3>
            <p className="text-sm text-gray-400 mt-1 mb-2 font-medium">
              Tag:{" "}
              <span className="text-blue-500 font-bold">
                {q.Tag.charAt(0).toUpperCase() + q.Tag.slice(1)}
              </span>
            </p>
            <p className="text-sm text-gray-400 mmb-2 font-medium mb-3">
              Title:{" "}
              <span className="text-blue-500 font-bold">
                {q.Title.charAt(0).toUpperCase() + q.Title.slice(1)}
              </span>
            </p>

            <button
              onClick={() => toggleAnswerVisibility(q._id)}
              className="flex items-center gap-2 mt-2 px-2 py-1.5 text-white  bg-blue-600 rounded-lg shadow-md hover:from-blue-500 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-300"
            >
              {visibleAnswers[q._id] ? <FaEyeSlash /> : <FaEye />}{" "}
              {visibleAnswers[q._id] ? "Hide Answer" : "Answer (50 Credit) "}
            </button>
            {visibleAnswers[q._id] && (
              <p className="mt-3 p-4 bg-gray-700 border border-gray-600 rounded-lg text-blue-300 shadow-inner font-medium">
                {q.Answer}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default QuestionList;
