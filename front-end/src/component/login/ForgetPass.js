
import React, { useState } from "react";
import { Button, Checkbox, Form, Input, message } from 'antd';
import { useNavigate } from "react-router-dom";


const ForgetPass = () => {

  const [email, seteamil] = useState('')
  const [otp, setOTP] = useState('')
  const [loade, setloade] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newpassword,setpassword] = useState('')
  const naviagte = useNavigate()
 
  const handlemail = async () => {
    setloade(true)
    let result = await fetch('http://localhost:5000/send-otp', {
      method: "post",
      body: JSON.stringify({ email }),

      headers: {
        'Content-Type': 'application/json'
      }
    })
    if (result.ok) {
      result = await result.json()
      message.success(result.message)
    } else {
      result = await result.json()
      message.warning(result.message)
    }
    setloade(false)
  }

  const hnadleOTP = async () => {

    let result = await fetch('http://localhost:5000/newPassword-verify-otp', {
      method: "post",
      body: JSON.stringify({ otp, email, newpassword }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    if (result.ok) {
      result = await result.json()
      message.success(result.message)
      naviagte('/login')
    } else {
      result = await result.json()
      message.warning(result.message)
    }
  }

  return (

    <div className="container p-3 pt-4">
      <div className="pt-4 forget-password row">
        <Form className="col-6"

          name="basic"
          autoComplete="off"
        >
          <h2>Forget Password</h2>
          <br />

          <Form.Item
            label="Email"
            name="Email"
            rules={[
              {
                required: true,
                message: 'Please Enter your Email!',
              },
            ]}
          >
            <Input type="email" onChange={(e) => seteamil(e.target.value)} placeholder="Enter Email" />
          </Form.Item>
          <br />

          <p>We will send you OTP on your Email it will be valid for 5 minutes,
            <br /> If the OTP expire regenerate "Just click Generate OTP".
          </p>

          <br />
          <Form.Item

          >
            <Button type="primary" onClick={handlemail} disabled={loade} >{loade ? <span>Loading...</span> : <span>Generate OTP</span>}</Button>
          </Form.Item>


          <br />
          <Form.Item
            label="OTP"
            name="OTP"

            rules={[
              {
                required: true,
                message: 'Please Enter your OTP!',
              },
            ]}
          >
            <Input.OTP onChange={(e) => setOTP(e)} />
          </Form.Item>
          <br />

          <p>when you enter OTP must be the Email Entered! already
            <br />The OTP must be 6 digit
          </p>
          <Form.Item
            label="New Password"
            name="Password"

            rules={[
              {
                required: true,
                message: 'Please Enter your New Password!',
              },
            ]}
          >
            <Input.Password  onChange={(e)=>setpassword(e.target.value)} placeholder="New password"
              visibilityToggle={{
                visible: passwordVisible,
                onVisibleChange: setPasswordVisible,
              }} />

          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" onClick={hnadleOTP} >Change Password</Button>
          </Form.Item>

        </Form>
      </div>
    </div>

  )


}


export default ForgetPass;