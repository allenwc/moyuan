import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Library from "@/pages/Library";
import Editor from "@/pages/Editor";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/editor/:novelId" element={<Editor />} />
        <Route path="*" element={<Library />} />
      </Routes>
    </Router>
  );
}
