import React, { useEffect, useState } from "react";
import { Card,Row,Col, message } from 'antd';
import { useNavigate } from "react-router-dom";

const { Meta } = Card;

const Display_event = ({refresh,onclick}) => {
    const [events, setEvents] = useState([]);
    const navigate = useNavigate()
    
    const fetchEvents = async () => {
        const userString = localStorage.getItem("user");
        if (userString) {
            const user = JSON.parse(userString);

            try {
                let result = await fetch('http://localhost:5000/display_event', {
                    method: 'POST',
                    body: JSON.stringify({ userId: user._id }),
                    headers: {
                        "Content-Type": "application/json"
                    }
                });

                result = await result.json();
                
                if (Array.isArray(result)) {
                    setEvents(result);
                } else {
                    setEvents(result);
                    message.warning(result.message);
                }
            } catch (error) {
                message.warning(error);
            }
        }
    };

    

    useEffect(() => {
        

        fetchEvents();
    }, [refresh]);
    
    return (
        <div style={{}}>
            <h1>Your Event's</h1>
            <Row gutter={16} className="justify-content-center">
          
            {events.length > 0 ? (
                events.map((event, index) => (
                    <Card
                        key={index}
                        hoverable
                        style={{
                            width: 250,
                            margin: 15,
                            padding: 10,
                        }}
                        // onClick={() => navigate('/in-event', {
                        //     state: {
                        //         prop: event._id, // Event ID
                        //         name: event.event_name // Event name (optional)
                        //     }
                        // })}
                        onClick={()=>{ 
                            const eventID = event._id
                            const name = event.event_name
                            const display_pin = event.pin
                            
                            onclick(eventID,name,display_pin)
                        }}
                        cover={<img alt="example" src={event.event_photo ? `http://localhost:5000/event_profile/${event.event_photo}` : "https://os.alipayobjects.com/rmsportal/QBnOOoLaAfKPirc.png"} />}
                    >
                        <Meta title={event.event_name}  />
                    </Card>
                ))
            ) : (
                
                <p >{events.result || "No event's!  Create new event's"}</p>
            )}
            
            </Row>
            </div>
        
    );
};

export default Display_event;
