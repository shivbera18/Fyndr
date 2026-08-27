import React, { useEffect, useState } from "react";
import { Image, message, Button, FloatButton, Popconfirm, Input } from 'antd';
import { DeleteOutlined, RollbackOutlined } from '@ant-design/icons';
import Upload_Img from "./Upload_Img";
import Qrcode from "./Qrcode";



const cancel = (e) => {
  message.info('Cancel');
};




const InEvent = ({ backbtn, eventID, name, pin, setRefresh }) => {
  const [images, setImages] = useState([]);
  const [hoveredImageIndex, setHoveredImageIndex] = useState(null);

  const [url, seturl] = useState('')
  const [updateName, setupdatename] = useState('')
  const [updatePin, setupdatePin] = useState('')
  const [onEdit, setonEdit] = useState(true)
  const [pin1, setpin] = useState('')
  const [name1, setname] = useState('')

  // const [pin,setpin]= useState('')

  function d_ref() {
    setRefresh(prev => prev + 1);
  }

  useEffect(() => {
    seturl(`http://localhost:3000/collect/${eventID}`)



    const fetchImages = async () => {
      try {

        const _id = eventID;
        let result = await fetch('http://localhost:5000/in-event', {
          method: "post",
          body: JSON.stringify({ _id }),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        result = await result.json();
        if (Array.isArray(result)) {
          setImages(result);
        } else {
          message.error("Images not found!");
          setImages([]);
        }
      } catch (error) {
        message.error("Error fetching images");
        setImages([]);
      }
    };

    fetchImages();
  }, [eventID, name, pin]);



  //event delete completely
  const confirm = async (e) => {
    const _id = eventID
    let result = await fetch('http://localhost:5000/delete-event', {
      method: "delete",
      body: JSON.stringify({ _id }),
      headers: {
        "Content-Type": "application/json"
      }

    })

    if (result.ok) {
      result = await result.json()
      message.success(`Event ${result.event_name} is Deleted!`);
      backbtn()
    } else {
      result = await result.json()
      message.error(result.message)
    }



  };

  const handleUpdateEvent = async () => {
    try {
      let result = await fetch(`http://localhost:5000/events/${eventID}`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ updateName, updatePin }),

      })

      if (result.ok) {
        result = await result.json()
        message.success(result.message)
        setname(updateName)
        setpin(updatePin)

      } else {
        result = await result.json()
        message.error(result.message)
      }
    } catch (error) {
      message.error('something wrong error with fetch')
    }
  }

  const handleDelete = async (name, _id) => {
    try {
      let result = await fetch('http://localhost:5000/delete-image', {
        method: "delete",
        body: JSON.stringify({ name, _id }),
        headers: {
          'Content-Type': 'application/json'
        }
      });
      result = await result.json();
      if (result.success) {
        message.success("Image deleted successfully!");
        setImages(images.filter(image => image.name !== name));
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error(error);
    }
  };

  return (
    <div className="">
      <Popconfirm
        title="Delete the Event"
        description="Are you sure to delete this Event?"
        onConfirm={confirm}
        onCancel={cancel}
        okText="Yes"
        cancelText="No"
      >
        <FloatButton shape="circle" type="primary"
          style={{
            insetInlineEnd: 24,


          }}
          icon={<DeleteOutlined />} />

      </Popconfirm>

      <FloatButton shape="circle" type="primary"
        style={{
          insetInlineEnd: 94,
        }}
        icon={<RollbackOutlined />} onClick={backbtn} ></FloatButton>



      <div>
        {name1 ? (<h4 className="p-2">Event: {name1}</h4>) : (<h4 className="p-2">Event: {name}</h4>)}
        {pin1 ? (<h5>Event PIN: {pin1}</h5>) : (pin ? <h5>Event PIN: {pin}</h5> : <h5>No PIN</h5>)}

        <Button
          onClick={() => {
            setonEdit(prev => !prev)
            setupdatePin(pin)
            setupdatename(name)
          }}
          type="primary"
        >Edit Pin or event</Button>
        {onEdit ? (null) : (
          <div>
            <input type="text" placeholder="Enter New name" defaultValue={name} onChange={(e) => setupdatename(e.target.value)} />
            <input type="text" placeholder="Enter New Pin" defaultValue={pin} onChange={(e) => setupdatePin(e.target.value)} />
            <Button onClick={() => { handleUpdateEvent(); setonEdit(true) }} type="primary" >Update</Button>
          </div>
        )}
        
        <p className="pt-4">Share this link with gust: <a href={url}> {url} </a></p>
        <Qrcode url={url} />
      </div>

      <div>
        <Upload_Img event_id={eventID} d_ref={d_ref} inevent={true} />
      </div>
      <div className="row p-4 content-justify-center">

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
          {images.length > 0 ? (
            images.map((image, index) => (
              <div
                key={index}
                style={{ position: "relative", }}
                onMouseEnter={() => setHoveredImageIndex(index)}
                onMouseLeave={() => setHoveredImageIndex(null)}
              >
                <Image
                  width={180}

                  src={`http://localhost:5000/uploads/${image.name}`}
                  alt={`image ${index}`}
                  style={{ display: "block" }}
                />
                {hoveredImageIndex === index && (
                  <Button
                    type="primary"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(image.name, image._id)}
                    style={{
                      position: "absolute",
                      top: "10%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      zIndex: 1,
                      opacity: 0.8,
                    }}
                  />
                )}
              </div>
            ))
          ) : (
            <p>No images found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InEvent;
