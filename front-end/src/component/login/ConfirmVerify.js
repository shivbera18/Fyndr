import { Button, message } from 'antd';
import React, { useEffect, useState } from 'react';
import {  useLocation ,useNavigate} from 'react-router-dom';



const ConfirmVerify = ()=>{
    const location = useLocation();
    const navigate = useNavigate()
    const [confirm,setconfirm] = useState('')

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const status = queryParams.get('status');

        const auth = localStorage.getItem("user")
        if (auth) {
            navigate("/dashboard")
        }

        // Optional: Auto-redirect to dashboard after successful verification
        if (status === 'success') {
            message.success("Verified you Email!!!")
            setconfirm("Verified your Email!")
            setTimeout(() => navigate('/'), 5000);
        }else{
            message.loading("link is experide!")
            setconfirm("The link is experide!!")
            setTimeout(() => navigate('/'), 5000);
        }
    }, []);
    return(
        <div className='pt-4'>

            <h1  className='pt-4'>{confirm}</h1>

        </div>
    )
}

export default ConfirmVerify;
