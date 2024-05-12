import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/">成功了吗？?</Route>
      </Routes>
    </Router>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));