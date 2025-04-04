import { useState, useCallback, useEffect } from "react";

let logoutTimer;

const useAuth = () => {
  const [token, setToken] = useState(null);
  const [tokenExpirationDate, setTokenExpirationDate] = useState(null);
  const [userId, setUserId] = useState(null);
  const [credit, setCredit] = useState(null);

  const login = useCallback((uid, token, currentCredit, expirationDate) => {
    setToken(token);
    setUserId(uid);
    setCredit(currentCredit);

    const tokenExpiry =
      expirationDate || new Date(new Date().getTime() + 1000 * 60 * 60);
    setTokenExpirationDate(tokenExpiry);

    localStorage.setItem(
      "userData",
      JSON.stringify({
        userId: uid,
        token: token,
        expiration: tokenExpiry.toISOString(),
        credit: currentCredit,
      })
    );

    console.log("User logged in:", { uid, token, currentCredit, tokenExpiry });
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setTokenExpirationDate(null);
    setUserId(null);
    setCredit(null);
    localStorage.removeItem("userData");

    console.log("User logged out");
  }, []);

  const updateCredit = useCallback((newCredit) => {
    setCredit(newCredit);
    const storedData = JSON.parse(localStorage.getItem("userData"));
    if (storedData) {
      storedData.credit = newCredit;
      localStorage.setItem("userData", JSON.stringify(storedData));
      console.log("Updated Local Storage:", storedData);
    }
  }, []);

  useEffect(() => {
    if (token && tokenExpirationDate) {
      const remainingTime =
        tokenExpirationDate.getTime() - new Date().getTime();
      logoutTimer = setTimeout(logout, remainingTime);
      console.log("Auto logout set for:", remainingTime / 1000, "seconds");
    } else {
      clearTimeout(logoutTimer);
    }
  }, [token, logout, tokenExpirationDate]);

  useEffect(() => {
    const storedData = JSON.parse(localStorage.getItem("userData"));
    if (
      storedData &&
      storedData.token &&
      new Date(storedData.expiration) > new Date()
    ) {
      login(
        storedData.userId,
        storedData.token,
        storedData.credit,
        new Date(storedData.expiration)
      );
    }
  }, []);

  return { token, login, logout, userId, credit, updateCredit };
};

export default useAuth;
