import React, { useEffect, useState, useContext } from "react";
import AuthContext from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css"; // Import CSS for scrollbar styling

const Dashboard = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/dashboard", {
      headers: { Authorization: "Bearer " + auth.token },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched dashboard recommendations:", data);
        setRecommendations(data);
      })
      .catch((error) =>
        console.error("Error fetching dashboard recommendations:", error)
      );
  }, [auth.token]);

  return (
    <div className="mt-17 p-6 bg-gray-900 text-white">
      <div className="border border-gray-700 p-4 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Recommendations</h2>
        {recommendations.length === 0 ? (
          <p>No new recommendations.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto hide-scrollbar">
            <ul className="space-y-4">
              {recommendations.map((paper) => (
                <li
                  key={paper._id}
                  className="p-4 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() => navigate(`/paper/${paper._id}`)}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold">
                      New paper {paper.title} uploaded for course [{paper.course || "N/A"}]
                    </span>
                    <span className="text-sm text-gray-400">
                      {new Date(paper.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;