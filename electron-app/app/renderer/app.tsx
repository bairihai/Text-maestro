import React from 'react';
import ReactDOM from 'react-dom';
import Router from './router';

import NavBar from './components/navbar';

function App() {
  return(
  <div style={{ display: 'flex', flexDirection: 'row', height: '100%' }}>

        <NavBar />


      <div style={{ flex: 1 }}>
        <Router />
      </div>
  </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));