import './App.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';


import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './component/landing/Theme';
import CollectEvent from './component/collect_images/Collect_event';
import Home from './component/home/Home';
import About from './component/About';
import LoginRegister from './component/login/Login_Register';
import Dashboard from './component/dashboard/Dashboard';
import InEvent from './component/dashboard/InEvent';
import CameraCaptureWithMask from './component/collect_images/CameraCaptureWithMask';
import EmailVerified from './component/login/EmailVerify';
import ConfirmVerify from './component/login/ConfirmVerify';
import ForgetPass from './component/login/ForgetPass';

function App() {


  return (
    <div className="App fy">
      <ThemeProvider>
      <BrowserRouter>







        <Routes>

          <Route path='/' element={< Home />} />
          <Route path='/forgetpassword' element={<ForgetPass/>}/>
          <Route path='/confirmed' element={<ConfirmVerify/>}/>
          <Route path="/emailverified" element={<EmailVerified />} />
          <Route path='/camera' element={<CameraCaptureWithMask/>}/>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/in-event' element={<InEvent />} />
          <Route path='/collect/:eventId' element={<CollectEvent />} />
          <Route path='/login' element={<LoginRegister />} />
          <Route path='/about' element={<About />} />

        </Routes>


      </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}

export default App;
