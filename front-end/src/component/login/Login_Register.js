import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import './style.css';
import Footer from "../Footer";
import Header from "../navbar/Header";
import { Input, message } from "antd";



const Login_Register = () => {
    useEffect(() => {
        const auth = localStorage.getItem("user")
        if (auth) {
            navigate("/dashboard")
        }
    })

    const [name, setname] = useState('')
    const [email, seteamil] = useState('')
    const [password, setpassword] = useState('')

    const navigate = useNavigate()




    const handleSubmit = async (e) => {
        e.preventDefault();
        let result = await fetch('http://localhost:5000/register', {
            method: 'post',
            body: JSON.stringify({ name, email, password }),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        // result = await result.json()
        // if (result.name&&result._id) {
        //     // localStorage.setItem("user", JSON.stringify(result))
        //     navigate(`/emailverified?email=${email}`);

        // }
        if(result.ok){
            
            navigate(`/emailverified`, {state: {
                        email: email, 
                        password: password 
                    }});
        }
        else {
            result = await result.json()
            message.warning(result.message)
        }

    };

    async function handleSubmit2(e){
        e.preventDefault()
        let result = await fetch('http://localhost:5000/login',{
            method:"post",
            body: JSON.stringify({email,password}),
            headers:{
                "Content-Type":"application/json"
            }
        })
        // result = await result.json()
        // if (result.name) {
        //     localStorage.setItem("user", JSON.stringify(result))
        //     navigate("/dashboard")

        if(result.ok){
            navigate(`/emailverified`, {state: {
                        email: email, // Event ID
                        password: password // Event name (optional)
                    }});
        

        }else{
            result = await result.json()
            message.warning(result.message);
            
        }
    }



    function en1() {
        const container = document.getElementById('container');
        container.classList.add("active");
    }
    function en2() {
        const container = document.getElementById('container');
        container.classList.remove("active");
    }


    return (
        <>
            <Header />
            <div className="row justify-content-center">
                <div className="container-1 " id="container">
                    <div className="form-container sign-up">
                        <form onSubmit={handleSubmit}>
                            <h1>Create Account</h1>
                            
                        
                            <input type="text" placeholder="Name" onChange={(e) => setname(e.target.value)} />
                            <input type="email" placeholder="Email" onChange={(e) => seteamil(e.target.value)} />
                            <Input.Password type="password" placeholder="Password" minLength={'8'} onChange={(e) => setpassword(e.target.value)} />
                            <button type="submit">Sign Up</button>
                        </form>
                    </div>
                    <div className="form-container sign-in">
                        <form onSubmit={handleSubmit2}>
                            <h1>Sign In</h1>
                           
                            <input type="email" placeholder="Email" onChange={(e) => seteamil(e.target.value)} />
                            <input type="password" placeholder="Password" minLength={'8'} onChange={(e) => setpassword(e.target.value)} />
                            <Link to={"/forgetpassword"}>Forget Your Password?</Link>
                            <button type="submit">Sign In</button>
                        </form>
                    </div>
                    <div className="toggle-container">
                        <div className="toggle">
                            <div className="toggle-panel toggle-left">
                                <h1>Welcome Back!</h1>
                                <p>Enter your personal details to use all of site features</p>
                                <button className="hidden" id="login" onClick={en2}>Sign In</button>
                            </div>
                            <div className="toggle-panel toggle-right">
                                <h1>Hello, Friend!</h1>
                                <p>Register with your personal details to use all of site features</p>
                                <button className="hidden" id="register" onClick={en1}>Sign Up</button>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
            <Footer />
        </>
    )
}

export default Login_Register;