// renderer/router.tsx

// import React from 'react';
import { HashRouter, Route, Routes, Navigate } from 'react-router-dom';
import Root from './container/root';

function Router() {
    return (
        <HashRouter>
          <Routes>
            <Route path="/" element={<Root />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      );
}
export default Router;