import React, { useState, useContext } from "react";
import AuthContext from "../../Context/AuthContext";

function Upload() {
  const auth = useContext(AuthContext);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState("");

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!image) return;

    setResult("");

    const formData = new FormData();
    formData.append("file", image);

    try {
      const response = await fetch("http://localhost:8000/uploadPaper", {
        method: "POST",
        headers: { Authorization: "Bearer " + auth.token },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Error occurred, please try again later");
      }

      const responseData = await response.json()
      console.log(responseData);
      setResult(responseData);
    } catch (error) {
      console.error("Upload error:", error);
      setResult("An error occurred. Please try again.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Upload Questions</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md space-y-4 transition-all"
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full text-sm text-gray-400 file:py-2 file:px-4 file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
        />

        {preview && (
          <div className="flex justify-center mt-4">
            <img
              src={preview}
              alt="Preview"
              className="w-48 h-48 rounded-lg shadow-lg object-cover border border-gray-700"
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2 px-4 rounded-lg font-semibold bg-blue-600 hover:bg-blue-700 transition-all duration-300 text-white"
        >
          Submit
        </button>
      </form>

      {result && (
        <div className="mt-6 bg-gray-800 p-4 rounded-lg shadow-xl w-full max-w-md">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <p className="text-gray-300">
            {typeof result === "string" ? result : JSON.stringify(result, null, 2)}
          </p>
        </div>
      )}
    </div>
  );
}

export default Upload;
