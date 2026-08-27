import { React, useEffect } from 'react'
import { Container } from 'react-bootstrap'
import { Card } from 'antd'
import { EyeInvisibleOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import Get_Start_Button from './Get_Started_Button'
import Sider from './Slider'
import Goal from './Goal'
import Header from '../navbar/Header'
import Footer from '../Footer'
import { useNavigate } from 'react-router-dom'



const { Meta } = Card;
const Home = () => {
  const navigate = useNavigate()
  useEffect(() => {
    const auth = localStorage.getItem("user")
    if (auth) {
      navigate("/dashboard")
    }
  })
  return (
    <div >
      <Header />
      <Sider />

      <Goal />
      <div className='row start-row bg1'>
        <Get_Start_Button />
      </div>
      <div className='row home-video2'>
        <div className='col-12 col-lg-5 col-sm-3 home-video2-h'>
          <h1>Powerful Face Recognition</h1>
          <h4>Easy to Find Your Photos</h4>
        </div>
        <div className='col-12 col-lg-6 col-sm-4 video-div'>
          <video
            autoPlay
            loop

          >
            <source src='/videos/scane.mp4' type='video/mp4' />
          </video>
        </div>
      </div>


      <Container className='bg '>
        <div className='row start-row'>
          <Get_Start_Button />
        </div>
      </Container>


      <Container>
        <div className='row start-row d-none d-sm-block' >
          <h1 >Face Recognition powered Sharing</h1>

          <h4 >Click a Selfie to find your photos instantly</h4>
          <h4 >New way to distribute Photos - Easy, Private and Fast.</h4>

          <div className='row justify-content-center  p-4'>

            <Card
              hoverable
              style={{ width: 200 }}
              cover={<img alt="" src="/images/1.png" />}
            >
              <Meta title="Create Event & Invite guests" description="Create an event, upload photos and invite all guests" />
            </Card>
            <Card
              hoverable
              style={{ width: 200 }}
              cover={<img alt="" src="/images/2.png" />}
            >
              <Meta title="Click a Selfie to find photos" description="Guest opens the link & clicks a selfie to find their photos" />
            </Card>
            <Card
              hoverable
              style={{ width: 200 }}
              cover={<img alt="" src="/images/3.png" />}
            >
              <Meta title="Get your photos" description="Guests can view, buy, download & share photos" />
            </Card>

          </div>
          <Get_Start_Button />
        </div>
      </Container>

      <Footer />

    </div>
  )
}

export default Home;