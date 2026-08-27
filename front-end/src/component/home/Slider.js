import {Carousel } from 'antd'
import React from 'react';

const contentStyle = {
 
    height: '500px', 
    width:"100%",
    lineHeight: '300px',
    
    textAlign: 'center',
    background: '#364d79',
    objectfit: 'cover',
  };

const Slider = ()=>{

    return(
        <div>
            <Carousel autoplay arrows className="d-none d-sm-block w col-12 slider-crop">
    <div >
      <img 
        src="/images/image1.png" 
        alt="1" 
        style={contentStyle}
      />
    </div>
    <div>
      <img 
        src="/images/wedding.jpg" 
        alt="2" 
        style={contentStyle}
      />
    </div>
    
    <div>
      <img 
        src="/images/wedding2.jpg" 
        alt="3" 
        style={contentStyle}
      />
    </div>
    {/* <div>
      <img 
        src="/images/imran.jpg" 
        alt="5" 
        style={contentStyle}
      />
    </div> */}
    <div>
      <img 
        src="/images/wedding4.jpg" 
        alt="4" 
        style={contentStyle}
      />
    </div>
  </Carousel>


        </div>

    )
}

export default Slider;