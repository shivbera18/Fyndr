import {React ,useEffect} from "react";
import Goal from "./home/Goal";
import { Container } from "react-bootstrap";
import Header from "./navbar/Header";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";

const About = ()=>{
    const navigate = useNavigate()
    useEffect(()=>{
        const auth = localStorage.getItem("user")
    if(auth){
      navigate("/dashboard")
    }
    })

    return(
         
        <>
        <Header/>
        
        <div className="row align-items-center about-bio">
            <div className="col-lg-5 col-12">
                <h1>Contribution</h1>
                <p className="">Fyndr is a production-grade event photo sharing platform built by Shiv Bera to help photographers deliver thousands of photos in seconds with AI face search.
                <br/><br/>Built for wedding & event photographers — QR, selfie-search, and instant downloads with a clean, professional experience for guests.

                </p>
            </div>
            <div className="col-lg-5 col-12 about-bio-img">
                <img src="/person/we.jpg"></img>
            </div>
        
        </div>

        <Goal/>

        <Footer/>
        </>
        
    )
}

export default About;