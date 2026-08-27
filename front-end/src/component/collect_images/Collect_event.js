import { Button, Form, Input, message } from "antd";
import { useWatch } from "antd/es/form/Form";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";



const Collect_event = () => {
    const { eventId } = useParams();
    const [resp, setresp] = useState('')
    const [pin, setpin] = useState('')
    const [studio, setstudio] = useState('')
    const [loade, setloade] = useState(false)
    const _id = eventId;
    const naviagte = useNavigate()

    const fetchEvents = async () => {

        try {

            let result = await fetch('http://localhost:5000/collect_event', {
                method: 'POST',
                body: JSON.stringify({ _id }),
                headers: {
                    "Content-Type": "application/json"
                }
            });



            if (result.ok) {
                result = await result.json();
                setresp(result.event)
                setstudio(result.studio)
                if (result.studio) {
                    setloade(true)
                }
            } else {
                result = await result.json();
                message.error(result.message)
            }

        } catch (error) {
            message.warning("Failed to fetch")
            console.warn("Failed to fetch events:", error);
        }

    };
    const handlePin = async (e) => {
        try {
            e.preventDefault()
            if (pin.length > 0 && pin.length <= 6) {
                let result = await fetch('http://localhost:5000/confirm_pin', {
                    method: "post",
                    body: JSON.stringify({ _id, pin }),
                    headers: {
                        "Content-Type": "application/json"
                    }

                })
                result = await result.json()
                if (result.pin) {
                    message.success(result.result)
                    naviagte("/camera", { state: _id })
                } else {
                    message.error(result.result)
                }
            } else {
                message.error("Pin is Required! only 6 digit")
            }
        } catch (error) {
            message.error("Pin is wrong! Contact to the photographer to provid the (Pin)!")

        }
    }


    useEffect(() => {


        fetchEvents();
    }, []);


    return (
        <div className="pt-4">
            {resp ? <h1 className="pt-4 m-4">Event Name: {resp.event_name}</h1> : <h1>The Event is Not available!</h1>}
            <div className="row p-4 justify-content-center">
                <div className="col-4">
                    <form  onSubmit={handlePin}>
                    <div>
                        {resp.pin ? <Input type="number" maxLength={6} onChange={(e) => setpin(e.target.value)} placeholder="Enter PIN" /> : <></>}
                        <br /><br />
                        {resp.pin ? <Button type="primary" onClick={handlePin}>Submit</Button> : null}
                    </div>
                    </form>
                    <br /><br />

                    {loade ? <h3>Photographer_detail</h3> : null}
                    <br /><br />
                    {loade ? (
                        <div>
                            <h4>{studio.studio_name}</h4>
                            <h5>Phone No: {studio.phone_no}</h5>
                            <p>Address: {studio.address}</p>
                            <p>Offer: {studio.offer}</p>
                            <p>{studio.description}</p>
                        </div>
                    ) : null}
                </div>
            </div>



        </div>
    )
}


export default Collect_event;