import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const openLogin = () => {
    setAuthMode('login');
    setIsAuthModalOpen(true);
  };

  const openRegister = () => {
    setAuthMode('register');
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => setIsAuthModalOpen(false);
  const switchToLogin = () => setAuthMode('login');
  const switchToRegister = () => setAuthMode('register');

  const login = (token, email) => {
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("userEmail", email);
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("userEmail");
  };

  const getUser = () => ({
    token: sessionStorage.getItem("token"),
    email: sessionStorage.getItem("userEmail"),
  });

  const isLoggedIn = () => !!sessionStorage.getItem("token");

  return (
    <AuthContext.Provider
      value={{
        isAuthModalOpen,
        authMode,
        openLogin,
        openRegister,
        closeAuthModal,
        switchToLogin,
        switchToRegister,
        login,
        logout,
        getUser,
        isLoggedIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
