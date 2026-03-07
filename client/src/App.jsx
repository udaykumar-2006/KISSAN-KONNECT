import React from 'react'
import Navbar from './components/layout/Navbar';
import Landing from './pages/Landing';
import {Routes, Route} from 'react-router-dom';

const App = () => {
  return (
    <div>
      
      <Routes>
        <Route path="/" element={<Landing />} />
      </Routes>
    </div>
  )
}

export default App