import React from 'react';
import ReactDOM from 'react-dom';
import Router from './router';

import NavBar from './components/navbar';

import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>

        <NavBar />
        <div style={{ flex: 1 }}>
          <Router />
        </div>
        
      </div>
    </BrowserRouter>
  );
}



ReactDOM.render(<App />, document.getElementById('root'));