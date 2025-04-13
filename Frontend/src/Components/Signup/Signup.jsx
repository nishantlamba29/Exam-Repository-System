import React, { useContext, useState, useEffect } from "react";
import AuthContext from "../../Context/AuthContext";
import { Spinner, Alert } from "@material-tailwind/react";
import { useNavigate } from "react-router-dom";
import { Assets } from "../../Assets/Assets";

export default function Signup() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [alertType, setAlertType] = useState("success");
  const [refOpen, setRefOpen] = useState(false);

  const [formData, setFormData] = useState({
    Name: "",
    Email: "",
    Password: "",
    refferalCode: ""
  });

  // Initialize with one empty dropdown selection (which will store course _id)
  const [selectedCourses, setSelectedCourses] = useState([""]);

  // Fetch courses from backend
  const [coursesData, setCoursesData] = useState([]);
  useEffect(() => {
    fetch("http://localhost:8000/api/courses")
      .then((res) => res.json())
      .then((data) => setCoursesData(data))
      .catch((error) => console.error("Error loading courses:", error));
  }, []);

  function handleChange(e) {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [e.target.name]: e.target.value,
    }));
  }

  const handleCourseChange = (index, e) => {
    const courseId = e.target.value;
    const newCourses = [...selectedCourses];
    newCourses[index] = courseId;
    setSelectedCourses(newCourses);

    // Automatically add another dropdown if valid course is selected and limit isn't reached
    if (courseId && index === newCourses.length - 1 && newCourses.length < 5) {
      setSelectedCourses((prevCourses) => [...prevCourses, ""]);
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const payload = {
      ...formData,
      enrolledCourses: selectedCourses.filter((id) => id),
    };
    try {
      const response = await fetch("http://localhost:8000/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Error occurred, please try again later");
      }
      const responseData = await response.json();

      auth.login(
        responseData.userId,
        responseData.token,
        responseData.credit,
        responseData.refCode
      );
      setMessage("Successfully Signed Up");
      setAlertType("blue");
    } catch (error) {
      setMessage("Not able to sign up, try again later");
      setAlertType("red");
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  }

  // Function to copy the referral code to clipboard
  const handleCopy = () => {
    if (auth.refCode) {
      navigator.clipboard.writeText(auth.refCode);
      alert("Referral code copied!");
    }
  };

  return (
    <>
      {message && (
        <Alert
          color={alertType}
          className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50"
        >
          {message}
        </Alert>
      )}
      <div
        className={`fixed top-0 left-0 right-0 bottom-0 z-20 p-10 flex justify-center items-center ${
          loading ? "backdrop-blur-md" : "backdrop-blur-xs"
        } bg-black/30`}
      >
        <form
          onSubmit={handleSubmit}
          className="bg-white relative p-10 rounded-xl text-slate-500 w-96"
        >
          {/* Scrollable container for the form fields */}
          <div className="max-h-[80vh] overflow-y-auto pr-2">
            <h1 className="text-2xl font-medium text-center text-neutral-700">
              Sign up
            </h1>
            <p className="text-sm text-center mb-4">
              Welcome! Please sign up to continue
            </p>

            <div className="border border-gray-300 flex items-center gap-2 px-4 py-2 rounded-full mt-4">
              <img src={Assets.email_icon} alt="Email Icon" />
              <input
                id="Name"
                name="Name"
                type="text"
                required
                placeholder="Full Name"
                value={formData.Name}
                onChange={handleChange}
                className="w-full outline-none placeholder-gray-400"
              />
            </div>

            <div className="border border-gray-300 flex items-center gap-2 px-4 py-2 rounded-full mt-4">
              <img src={Assets.email_icon} alt="Email Icon" />
              <input
                id="Email"
                name="Email"
                type="email"
                required
                placeholder="Email"
                value={formData.Email}
                onChange={handleChange}
                className="w-full outline-none placeholder-gray-400"
              />
            </div>

            <div className="border border-gray-300 flex items-center gap-2 px-4 py-2 rounded-full mt-4">
              <img src={Assets.lock_icon} alt="Lock Icon" />
              <input
                name="Password"
                type="password"
                required
                placeholder="Password"
                value={formData.Password}
                onChange={handleChange}
                className="w-full outline-none placeholder-gray-400"
              />
            </div>

            {refOpen && (
              <div className="border border-gray-300 flex items-center gap-2 px-4 py-2 rounded-full mt-4">
                <img src={Assets.email_icon} alt="Lock Icon" />
                <input
                  id="refferalCode"
                  name="refferalCode"
                  type="text"
                  required={false}
                  placeholder="Refferal Code"
                  value={formData.refferalCode}
                  onChange={handleChange}
                  className="w-full outline-none placeholder-gray-400"
                />
              </div>
            )}

            {/* Courses selection section */}
            <div className="mt-4">
              {selectedCourses.map((courseId, index) => {
                // Filter available courses for the dropdown
                const availableCourses = coursesData.filter(
                  (c) =>
                    !selectedCourses.some(
                      (id, i) => i !== index && id === c._id
                    )
                );
                return (
                  <div key={index} className="mt-2">
                    <select
                      value={courseId}
                      onChange={(e) => handleCourseChange(index, e)}
                      className="w-full border border-gray-300 rounded-full px-4 py-2 outline-none"
                      style={{
                        paddingRight: "1rem",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <option value="">Select a course</option>
                      {availableCourses.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.code} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* New Referral Code Display with Copy Button */}
            {auth.refCode && (
              <div className="flex items-center space-x-2 bg-gray-800 text-white px-3 py-1 mt-4 rounded-lg">
                <span className="text-[10px] text-gray-300">
                  Ref Code:{" "}
                  <span className="font-semibold text-white">{auth.refCode}</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded focus:outline-none"
                >
                  Copy
                </button>
              </div>
            )}

            <p
              onClick={() => {
                setRefOpen(true);
              }}
              className="text-sm text-blue-600 my-4 cursor-pointer text-center"
            >
              Have a refferal code?
            </p>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-white font-semibold shadow-md hover:bg-indigo-500"
            >
              {loading ? <Spinner className="h-5 w-5" /> : "Sign Up"}
            </button>
          </div>
          {/* Close icon remains fixed relative to the form */}
          <img
            onClick={() => navigate("/")}
            src={Assets.cross_icon}
            alt="Close"
            className="absolute top-5 right-5 cursor-pointer w-5 h-5"
          />
        </form>
      </div>
    </>
  );
}
