import { Button, message } from 'antd';
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Verified = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [resendStatus, setResendStatus] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { email, password } = location.state || {};


    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const status = queryParams.get('status');

        const auth = localStorage.getItem("user")
        if (auth) {
            navigate("/dashboard")
        }

        // Check verification status immediately
        if (email,password) {
            checkVerificationStatus();
        }

        // Optional: Auto-redirect to dashboard after successful verification
        if (status === 'success') {
            message.success("Verified you Email!!!")
        }
    }, [location, navigate]);

    const checkVerificationStatus = async () => {
        try {
            const response = await fetch('http://localhost:5000/check-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email,password }),
            });

            const data = await response.json();
            if (data.name&&data._id) {
                message.success("Verified Succefully")
                localStorage.setItem("user", JSON.stringify(data))
                navigate('/dashboard'); // Redirect if already verified
            }else{
                message.warning(data.message)
            }
        } catch (error) {
            message.warning('Error checking verification status:');
        }
    };


    async function handleResend(e){
        e.preventDefault()
   
        setIsLoading(true);
        try {
            // Ensure the email is passed correctly
            

            const response = await fetch('http://localhost:5000/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();
            message.warning(data.message)
            setResendStatus(data.message || 'Verification email resent.');
        } catch (error) {
            setResendStatus('Failed to resend the verification email. Please try again.');
        } finally {
            setIsLoading(false);
        
    };

}

    return (
        <div>
            <h1 className='pt-5'>Verifying your email...</h1>
            <h5>Please check your mail-Box Email: {email}</h5>
            <p>we send you verification link just click to verify Your account.</p>
            <Button className='primary-btn' onClick={checkVerificationStatus}>
                Verification check
            </Button><br/><br/>
            <Link onClick={handleResend} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Resend Verification Email'}
            </Link>
            {resendStatus && <p>{resendStatus}</p>}
        </div>
    );
};

export default Verified;
