import React, { useContext, useState } from "react";
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

  const [formData, setFormData] = useState({
    Name: "",
    Email: "",
    Password: "",
  });

  function handleChange(e) {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Error occurred, please try again later");
      }
      const responseData = await response.json();
      auth.login(responseData.userId, responseData.token, 100);
      setMessage("Successfully Signed Up");
      setAlertType("blue");
    } catch (error) {
      setMessage("Not able to sign up, try again later");
      setAlertType("red");
    }
    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  }

  return (
    <>
      {message && (
        <Alert color={alertType} className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50">
          {message}
        </Alert>
      )}
      <div className={`fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-center items-center ${loading ? "backdrop-blur-md" : "backdrop-blur-xs"} bg-black/30`}>
        <form
          onSubmit={handleSubmit}
          className="bg-white relative p-10 rounded-xl text-slate-500 w-96"
        >
          <h1 className="text-2xl font-medium text-center text-neutral-700">Sign up</h1>
          <p className="text-sm text-center mb-4">Welcome! Please sign up to continue</p>
          
          <div className="border border-gray-300 flex items-center gap-2 px-4 py-2 rounded-full mt-4">
            <img src={Assets.email_icon} alt="" />
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
            <img src={Assets.email_icon} alt="" />
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
            <img src={Assets.lock_icon} alt="" />
            <input
              id="Password"
              name="Password"
              type="password"
              required
              placeholder="Password"
              value={formData.Password}
              onChange={handleChange}
              className="w-full outline-none placeholder-gray-400"
            />
          </div>
          
          <p className="text-sm text-blue-600 my-4 cursor-pointer text-center">Forgot password?</p>
          
          <button
            type="submit"
            className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-white font-semibold shadow-md hover:bg-indigo-500"
            disabled={loading}
          >
            {loading ? <Spinner className="h-5 w-5" /> : "Sign Up"}
          </button>
          
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
