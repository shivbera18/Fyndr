import React, { useEffect, useState } from "react";
import Upload_Img from "./Upload_Img";
import './style.css';
import { Link, useNavigate, } from "react-router-dom";
import { Input, message, Switch, Upload } from 'antd'
import ImgCrop from 'antd-img-crop';
import Qrcode from './Qrcode'
import Display_event from "./Display_event";
import InEvent from "./InEvent";
import Photographer_detail from "./Photographer_detail";
import { Color } from "antd/es/color-picker";



const Dashboard = () => {

    const navigate = useNavigate()
    const [Dsiplay_Pin, setDisplay_Pin] = useState('')
    const [useeffect, setuseeffect] = useState(0)
    const [eventdata, seteventdata] = useState([])
    const [eventID, seteventID] = useState('')
    const [eventName, seteventName] = useState('')
    const [renderEvent, setrenderEvent] = useState(false)
    let [result, setresult] = useState("")
    const [pin, setpin] = useState('')
    const [switcher, setswitcher] = useState(false)
    const [url, seturl] = useState('')
    const [refresh, setRefresh] = useState(0);
    const [createEvent, setcreateEvent] = useState(false)
    const [DisplayEvent, setDisplayEvent] = useState(false)
    const [event_name, setevent] = useState('')
    const [username, setusername] = useState('')
    const [fileList, setFileList] = useState([])
    useEffect(() => {
        const auth = localStorage.getItem("user")
        if (!auth) {
            navigate("/login")
        }
        setusername(JSON.parse(auth))

        const link = document.createElement('link');
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js';

        script.integrity = 'sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL';
        script.crossOrigin = 'anonymous';

        link.href = 'https://cdn.lineicons.com/4.0/lineicons.css';
        link.rel = 'stylesheet';
        link.type = 'text/css';

        document.head.appendChild(link);
        document.head.appendChild(script);

        return () => {
            document.head.removeChild(link);
            document.head.removeChild(script);
        };
    }, [useeffect]);
    // ------------------------------------------------------------------------------------------------------------------
    //atn desgin
    const onChange = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };

    const onPreview = async (file) => {
        let src = file.url;
        if (!src) {
            src = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file.originFileObj);
                reader.onload = () => resolve(reader.result);
            });
        }

        const image = new Image();
        image.src = src;
        const imgWindow = window.open(src);
        imgWindow?.document.write(image.outerHTML);
    };

    //-------------------------------------------------------------------------------------------------------------------------

    function en() {
        document.querySelector("#sidebar").classList.toggle("expand");
    }

    function create_event() {
        setevent("")
        const event = document.getElementById('event');
        const createEvent = document.getElementById('create-event');
        const inevent = document.getElementById('InEvent')
        const complete_detail = document.getElementById('complete-detail')

        // Hide the events and show the create-event section
        event.classList.remove("active");
        event.style.display = 'none';
        inevent.classList.remove("active");
        inevent.style.display = 'none';
        complete_detail.classList.remove("active");
        complete_detail.style.display = 'none';

        createEvent.classList.add("active");
        createEvent.style.display = '';
        setrenderEvent(false)
        seteventID('')
        seteventName('')
    }

    function Events() {
        const createEvent = document.getElementById('create-event');
        const event = document.getElementById('event');
        const inevent = document.getElementById('InEvent')
        const complete_detail = document.getElementById('complete-detail')

        // Hide the create-event and show the events section
        createEvent.classList.remove("active");
        createEvent.style.display = 'none';
        inevent.classList.remove("active");
        inevent.style.display = 'none';
        complete_detail.classList.remove("active");
        complete_detail.style.display = 'none';

        setRefresh(prev => prev + 1);
        event.classList.add("active");
        event.style.display = '';
        setcreateEvent(false)
        setrenderEvent(false)
        seteventID('')
        seteventName('')


    }
    function inevents(eventID, name, display_pin) {
        const createEvent = document.getElementById('create-event');
        const event = document.getElementById('event');
        const inevent = document.getElementById('InEvent')
        const complete_detail = document.getElementById('complete-detail')

        // Hide the create-event and show the events section
        createEvent.classList.remove("active");
        createEvent.style.display = 'none';
        event.classList.remove("active");
        event.style.display = 'none';
        complete_detail.classList.remove("active");
        complete_detail.style.display = 'none';

        inevent.classList.add("active");
        inevent.style.display = '';
        setcreateEvent(false)
        seteventID(eventID)
        seteventName(name)
        setDisplay_Pin(display_pin)
        setrenderEvent(true)

    }
    function complete_d() {
        const createEvent = document.getElementById('create-event');
        const event = document.getElementById('event');
        const inevent = document.getElementById('InEvent')
        const complete_detail = document.getElementById('complete-detail')

        // Hide the create-event and show the events section
        createEvent.classList.remove("active");
        createEvent.style.display = 'none';
        event.classList.remove("active");
        event.style.display = 'none';
        complete_detail.classList.remove("active");
        complete_detail.style.display = 'none';

        complete_detail.classList.add("active");
        complete_detail.style.display = '';
        setcreateEvent(false)
        setrenderEvent(false)
        seteventID('')
        seteventName('')

    }

    const make_event = async () => {
        const userString = localStorage.getItem("user"); // Get the user data (string)
        if (userString) {
            const user = JSON.parse(userString); // Parse the JSON string into an object
            const created_id = user._id; // Access the 'id' property of the user
            if (pin.length <= 6) {
                const formData = new FormData();
                formData.append("event_name", event_name);
                formData.append("created_id", created_id);
                formData.append("pin", pin);

                // Add the selected image file (assuming it's the first file in fileList)
                if (fileList[0]) {
                    formData.append("event_photo", fileList[0].originFileObj);
                }

                // Send the FormData object in the fetch request
                let result = await fetch('http://localhost:5000/event', {
                    method: "POST",
                    body: formData
                });

                result = await result.json();

                if (result.event_name && result._id) {
                    message.success("Event is created! ");
                    seturl(`http://localhost:3000/collect/${result._id}`);
                    setcreateEvent(true);
                    setRefresh(prev => prev + 1);
                    setevent("");
                    setpin("");
                    setresult(result);
                    setFileList([]); // Clear file list after successful upload
                } else {
                    message.warning(result.result);
                }
            } else {
                message.error("Only 6 Digit Pin Accepted");
            }
        } else {
            alert("No user found in localStorage");
        }
    };




    const logout = () => {

        const result = window.confirm("Are you sure you want to logout?");
        if (result) {
            localStorage.clear();
            navigate("/login");
        }

        setuseeffect(prev => prev + 1);

    }

    return (
        <div className="wrapper ">
            <aside id="sidebar" className="expand">
                <div className="d-flex">
                    <button className="toggle-btn " type="button" onClick={en}>
                        <i className="lni lni-grid-alt"></i>
                    </button>
                    <div className="sidebar-logo">
                        <a href="#">Snap Sap</a>
                    </div>
                </div>
                <ul className="sidebar-nav">
                    <li className="sidebar-item">
                        <Link onClick={Events} className="sidebar-link">
                            <i className="lni lni-layers"></i>
                            <span>Event's</span>
                        </Link>
                    </li>
                    <li className="sidebar-item">
                        <Link onClick={create_event} className="sidebar-link">
                            <i className="lni lni-save"></i>
                            <span>Create New Event</span>
                        </Link>
                    </li>
                    <li className="sidebar-item">
                        <Link onClick={complete_d} className="sidebar-link">
                            <i className="lni lni-home"></i>
                            <span>Profile</span>
                        </Link>
                    </li>
                </ul>
                <div className="sidebar-footer">
                    <Link onClick={logout} className="sidebar-link">
                        <i className="lni lni-exit"></i>
                        <span>Logout</span>
                    </Link>
                </div>
            </aside>
            <div className="main ">
                <nav className="navbar navbar-expand px-4 py-3">
                    <form action="#" className="d-none d-sm-inline-block"></form>
                    <div className="navbar-collapse collapse">
                        <ul className="navbar-nav ms-auto">
                            <li className="nav-item dropdown px-3">
                                <a href="" data-bs-toggle="dropdown" className="nav-icon pe-md-0">
                                    <h4 >User: {username.name}</h4>
                                </a>
                                <div className="dropdown-menu dropdown-menu-end rounded">
                                    <Link onClick={logout} className="">
                                        <i className="lni lni-exit"></i>
                                        <span>Logout!!! </span>
                                    </Link>
                                </div>
                            </li>
                        </ul>
                    </div>
                </nav>

                <main className="px-3 py-4">
                    <div className="container-fluid">
                        {/* Event display */}
                        <div id="event" className=" justify-content-center active">
                            {/* <div><h1>Your Event's</h1></div> */}

                            <Display_event refresh={refresh} onclick={inevents} eventdata={eventdata} />

                        </div>

                        {/* In Event photos */}
                        <div id="InEvent" className=" justify-content-center active" style={{ display: 'none' }} >
                            <div>
                                {renderEvent ? <InEvent backbtn={Events} setRefresh={setRefresh} eventID={eventID} name={eventName} pin={Dsiplay_Pin} /> : null}
                            </div>
                        </div>

                        {/* Create Event */}
                        <div id="create-event" className="row justify-content-center" style={{ display: 'none' }}>
                            <h1>Create New Event</h1>

                            <div className="col-12 col-md-4 p-3">
                                <h5>Enter Event Name</h5>

                                <div className=" ">
                                    <Input type="text" onChange={(e) => setevent(e.target.value)} value={event_name} placeholder="Event Name" />
                                    <ImgCrop rotationSlider>
                                        <Upload

                                            listType="picture-card"
                                            fileList={fileList}
                                            onChange={onChange}
                                            onPreview={onPreview}
                                        >
                                            {fileList.length < 1 && 'Cover Image'}
                                        </Upload>
                                    </ImgCrop>
                                </div>
                                <div className="pt-3">

                                    <div className="row">
                                        <div className="col-3">
                                            <h5 >Set PIN</h5>
                                        </div>
                                        <div className="col-8">
                                            <Switch onChange={() => {
                                                if (switcher) {
                                                    setswitcher(false)
                                                    setpin("")
                                                } else {
                                                    setswitcher(true)
                                                }
                                            }} />
                                        </div>
                                    </div>
                                    <div className="pt-2">

                                        {switcher ? <h5> Enetr 6 digit Pin<Input type="number" value={pin} onChange={(e) => setpin(e.target.value)} placeholder="Enter Digit" maxLength={6} /></h5> : null}
                                    </div>
                                </div>
                            </div>
                            <div className="">


                                <button onClick={make_event} className="primary btn ">Create event </button>
                                <div>
                                    {createEvent ? <p className="pt-4">Share this link with gust: <a href={url}>{url}</a></p> : <></>}
                                    {createEvent ? <Qrcode url={url} /> : <></>}

                                </div>

                            </div>
                            <div className="image">

                                {createEvent ? <Upload_Img event_id={result._id} /> : <></>}


                            </div>
                        </div>

                        {/* Complete component */}

                        <div id="complete-detail" className="row justify-content-center" style={{ display: 'none' }}>

                            <Photographer_detail />
                        </div>
                    </div>
                </main>



                <div className="row text-body-secondary footer">
                    <div className="col-12 ">
                        <h5>Crafted by Shiv Bera — Fyndr)</h5>
                    </div>

                </div>


            </div>
        </div>
    );
};

export default Dashboard;
