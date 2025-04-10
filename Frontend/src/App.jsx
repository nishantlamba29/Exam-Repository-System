import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthContext from "./Context/AuthContext";
import useAuth from "./Hooks/AuthHook";

import Navbar from "../src/Components/Navbar/Navbar";
import Signup from "./Components/Signup/Signup";
import Login from "./Components/Login/Login";
import Footer from "./Components/Footer/Footer";
import Hero from "./Components/Hero/Hero";
import Upload  from "./Components/Upload/Upload";
import Subscription from "./Components/Subscription/Subscription";
import Question from "./Components/Question/Question";
import Spinnerr from "./Components/Spinner/Spinner";
import Dashboard from "./Components/Dashboard/Dashboard";

function App() {
  const { token, login, logout, userId, credit, updateCredit } = useAuth();

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn: !!token,
        token: token,
        userId: userId,
        login: login,
        logout: logout,
        credit: credit,
        updateCredit: updateCredit,
      }}
    >
      <Router>
        <Navbar />
        <main className="flex-grow">
          <Routes>
            {!userId ? (
              <>
                <Route path="/" element={<Hero />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/*" element={<Signup />} />
              </>
            ) : (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/papers" element={<Question />} />
                <Route path="/spinner" element={<Spinnerr />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/*" element={<Dashboard />} />
              </>
            )}
          </Routes>
        </main>
        <Footer />
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
