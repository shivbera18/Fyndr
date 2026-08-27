
import './App.css';
import './component/Style-css/Footer-Header.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';

import PrivateRoute from './component/PrivateRoute';


import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import Header from './component/navbar/Header';
import Footer from './component/Footer';

import Collect_event from './component/collect_images/Collect_event';
import Home from './component/home/Home';
import About from './component/About';
import Login_Register from './component/login/Login_Register';
import Dashboard from './component/dashboard/Dashboard'
import InEvent from './component/dashboard/InEvent';
import CameraCaptureWithMask from './component/collect_images/CameraCaptureWithMask';
import EmailVerified from './component/login/EmailVerify';
import ConfirmVerify from './component/login/ConfirmVerify';
import ForgetPass from './component/login/ForgetPass';

function App() {


  return (
    <div className="App">



      <BrowserRouter>







        <Routes>

          <Route path='/' element={< Home />} />
          <Route path='/forgetpassword' element={<ForgetPass/>}/>
          <Route path='/confirmed' element={<ConfirmVerify/>}/>
          <Route path="/emailverified" element={<EmailVerified />} />
          <Route path='/camera' element={<CameraCaptureWithMask/>}/>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/in-event' element={<InEvent />} />
          <Route path='/collect/:eventId' element={<Collect_event />} />
          <Route path='/login' element={<Login_Register />} />
          <Route path='/about' element={<About />} />

        </Routes>


      </BrowserRouter>

    </div>
  );
}

export default App;
