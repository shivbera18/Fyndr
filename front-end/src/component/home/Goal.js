import React from "react";

const Goal = () => {
    return (
        <div className='row home-goal'>

            <div className='col-12 col-lg-6 col-dm-5 pt-5'>
                <p>HOW DOES IT WORK</p>
                <h1>How To Collect <br/>Your Wedding Photos? </h1>
                
            </div>
            <div className='col-12 col-lg-6 col-md-5 '>
                <video className=' '
                    autoPlay
                    loop
                    width={'375'}
                >
                    <source src="/images/Share_Event.mp4" type="video/mp4" />
                </video>
            </div>

        </div>
    )
}

export default Goal;