import { Suspense } from "react";
import Navbar from "../components/landing/Navbar";
import Hero from "../components/landing/Hero";
import { LazyFeatures, LazyHowItWorks, LazyContact, LazyFooter } from "../utils/lazyLoad";
import "./LandingPage.css";

// Fallback loading component
const SectionLoader = () => (
  <div style={{
    minHeight: "400px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#FFFFFF"
  }}>
    <div style={{
      width: "40px",
      height: "40px",
      border: "3px solid #E2E8F0",
      borderTopColor: "#5A0E24",
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    }} />
  </div>
);

export default function LandingPage() {
  return (
    <div className="landing-page">
      <Navbar />
      <main>
        <Hero />
        <Suspense fallback={<SectionLoader />}>
          <LazyFeatures />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <LazyHowItWorks />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <LazyContact />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <LazyFooter />
        </Suspense>
      </main>
    </div>
  );
}
