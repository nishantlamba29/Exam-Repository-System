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
      if (file.type === "application/pdf") {
        const fileURL = URL.createObjectURL(file);
        setPreview({ type: "pdf", url: fileURL });
      } else if (file.type.startsWith("image/")) {
        setPreview({ type: "image", url: URL.createObjectURL(file) });
      } else {
        setPreview(null);
      }
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

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || "Error occurred, please try again later");
      }
      console.log(responseData);
      setResult(responseData.message);
    } catch (error) {
      console.error("Upload error:", error);
      setResult(error.message);
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
          accept="image/*,application/pdf"
          onChange={handleImageChange}
          className="w-full text-sm text-gray-400 file:py-2 file:px-4 file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
        />

        {preview && (
          <div className="flex justify-center mt-4 w-full">
            {preview.type === "image" && (
              <img
                src={preview.url}
                alt="Preview"
                className="w-48 h-48 rounded-lg shadow-lg object-cover border border-gray-700"
              />
            )}
            {preview.type === "pdf" && (
              <iframe
                src={preview.url + "#toolbar=0"}
                title="PDF Preview"
                className="w-64 h-80 border border-gray-700 rounded"
                frameBorder="0"
              />
            )}
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
