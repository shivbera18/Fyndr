import React from 'react'
import { Link } from 'react-router-dom'
import {Nav} from 'react-bootstrap'




const Footer = () => {
    return (
        <>
            <div className="Footer">
                <div className="container">
                    <div className="row">
                        <div className="col-md-6 col-lg-5 col-12 ft-1">
                            <h3><span>Fyndr </span>CODES</h3>
                            <p>Fyndr — Find yourself in every event. Fast, private, beautiful.</p>
                            
                        </div>
                        <div className="col-md-6 col-lg-2 col-12 ft-2 ">
                            <h5>Quick Links</h5>
                            <ul>
                                <li className="nav-item">
                                    <Nav.Link as = {Link} to={'/'}>Home</Nav.Link>
                                </li>
                                <li className="nav-item">
                                <Nav.Link as = {Link} to={'/login'}>Login</Nav.Link>
                                </li>
                               
                                <li className="nav-item">
                                <Nav.Link as = {Link} to={'/about'}>About</Nav.Link>
                                </li>
                                
                            </ul>
                        </div>

                        <div className='col-md-6 col-lg-4 col-12'>
                            <h1>Contact us</h1>
                            <p>whatsapp: +91 90000 00000 <br/>
                            Email: shiv@fyndr.in </p>

                        </div>

                        
                    </div>
                </div>
            </div>
            <div className='Last-footer'>
                <p>Crafted by Shiv Bera — Fyndr</p>
            </div>
        </>
    )
}

export default Footer