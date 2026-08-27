import React, { useContext } from 'react';
import { Button, ConfigProvider, Space, } from 'antd';
import { AntDesignOutlined } from '@ant-design/icons';
import { css } from '@emotion/css';
import { useNavigate } from 'react-router-dom';
import { Container} from 'react-bootstrap'

const Get_Start_Button = () => {
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext);
  const rootPrefixCls = getPrefixCls();

  // CSS for the button
  const linearGradientButton = css`
    &.${rootPrefixCls}-btn-primary:not([disabled]):not(.${rootPrefixCls}-btn-dangerous) {
      border-width: 0;
      position: relative;
      overflow: hidden;
      border-radius: 4px;
     

      > span {
        position: relative;
      }

      &::before {
        content: '';
        background: linear-gradient(135deg, #6253e1, #04befe);
        position: absolute;
        inset: 0;
        opacity: 1;
        transition: opacity 0.3s;
        z-index: 0;
        border-radius: inherit;
      }

      &:hover::before {
        opacity: 0;
      }

      & > span {
        position: relative;
        z-index: 1;
      }
    }` ;

  const navigate = useNavigate();

  return (
    
      <>

      <ConfigProvider  >
        <Space className="">
          {/* Applying dynamic class using `className` */}
          <Button
            type="primary"
            description='Start'
            onClick={() => navigate('/dashboard')}
            size="large"
            icon={<AntDesignOutlined />}
            className={linearGradientButton} // Add the dynamic class here
          >
            GET Started
          </Button>
        </Space>
      </ConfigProvider>
      
      {/* <img className='col-md-4 col-lg-6 col-12' src='/images/img.png'></img> */}
      </>
  );
};

export default Get_Start_Button;
