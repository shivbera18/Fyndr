import React from 'react';
import { useNavigate } from 'react-router-dom';
import NeoButton from '../ui/NeoButton';

const Get_Start_Button = ({ text = 'Get Started Free →', variant = 'yellow', size = 'lg' }) => {
  const navigate = useNavigate();

  return (
    <NeoButton
      variant={variant}
      size={size}
      onClick={() => {
        const auth = localStorage.getItem('user');
        if (auth) {
          navigate('/dashboard');
        } else {
          navigate('/login');
        }
      }}
    >
      {text}
    </NeoButton>
  );
};

export default Get_Start_Button;
