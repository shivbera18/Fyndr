import React,{useEffect} from "react";
import {Link}from 'react-router-dom'
import {Nav,Navbar,Container} from 'react-bootstrap'
import './header.css'

const Header = () => {
    useEffect(() => {
        // Create a link element
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'; // Replace with your CDN URL
    
        // Append the link element to the head
        document.head.appendChild(link);
    
        // Optional: Cleanup the link when the component is unmounted
        return () => {
          document.head.removeChild(link);
        };
      }, []);
    return (
        <div className="header ">

            <input type="checkbox" name="" id="chek" />
            <label for="chek"><i className="fa-solid fa-bars"></i></label>
            <Link className="logo" to={'/'} >snap shot</Link>
            <nav className="">
            <Link to={'/'} >Home</Link>
            <Link to={'/about'} >About</Link>
            
                
                
            </nav>
            <Link to={'/login'} className="btn">sign up</Link>

        </div>
    )
}
export default Header;


