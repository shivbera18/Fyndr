import { Input, Form, Button, message } from "antd";
import TextArea from "antd/es/input/TextArea";
import React, { useEffect, useState } from "react";




const Photographer_detail = () => {

    const [studio_name, setname] = useState('')
    const [phone_no, setphone] = useState("")
    const [address, setaddress] = useState('')
    const [offer, setoffer] = useState('')
    const [description, setdescription] = useState('')
    const [exist, setexist] = useState(false)
    const [studioData, setstudiodata] = useState({})
    const [editMode, setEditMode] = useState(false);
    const [refresh, setRefresh] = useState(0)


    useEffect(() => {
        const fetchStudio = async () => {
            let user = localStorage.getItem('user');
            user = JSON.parse(user);
            const create_by = user._id;

            try {
                const resp = await fetch(`http://localhost:5000/exist-studio?create_by=${create_by}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const result = await resp.json();

                if (resp.ok) {
                    setstudiodata(result.exist)
                    setexist(true);

                }
            } catch (error) {
                message.error('An unexpected error occurred');
            }
        };

        fetchStudio();
    }, [refresh]);


    async function handleform(e) {
        e.preventDefault();

        let user = localStorage.getItem('user')
        user = JSON.parse(user)
        const create_by = user._id


        let resp = await fetch('http://localhost:5000/studio', {
            method: "post",
            body: JSON.stringify({ studio_name, phone_no, address, offer, description, create_by }),
            headers: {
                'Content-Type': 'application/json'
            }

        })
        if (resp.ok) {
            resp = await resp.json()
            setRefresh(prev => prev + 1);
            message.success((resp.message))
        } else {
            resp = await resp.json()
            message.error(resp.message)
        }

    }

    const handleEdit = () => {
        setEditMode(!editMode)
        setname(studioData.studio_name)
        setphone(studioData.phone_no)
        setaddress(studioData.address)
        setdescription(studioData.description)
        setoffer(studioData.offer)

    }


    return (
        <div className="">
            {exist ? (
                <div>
                    <h3>Your Studio Details</h3>
                    <div className="p-4 m-4">
                        {/* Replace this section with the actual studio data display */}
                        <p><strong>Studio Name:</strong> {studioData.studio_name}</p>
                        <p><strong>Phone Number:</strong> {studioData.phone_no}</p>
                        <p><strong>Address:</strong> {studioData.address}</p>
                        <p><strong>Offers:</strong> {studioData.offer}</p>
                        <p><strong>Description:</strong> {studioData.description}</p>
                        <Button
                            type="primary"
                            onClick={ handleEdit}>
                            {editMode ? "Cancel" : "Edit"}
                        </Button>
                    </div>

                    {/* Conditionally render edit form */}
                    {editMode && (
                        <div className="p-4 m-4">
                            <Form onSubmitCapture={handleform}>
                                <Input
                                    type="text"
                                    defaultValue={studioData.studio_name}
                                    onChange={(e) => setname(e.target.value)}
                                    placeholder="Your Studio name"
                                />
                                <Input
                                    type="number"
                                    defaultValue={studioData.phone_no}
                                    onChange={(e) => setphone(e.target.value)}
                                    maxLength={13}
                                    placeholder="Studio Phone No"
                                />
                                <Input
                                    type="text"
                                    defaultValue={studioData.address}
                                    onChange={(e) => setaddress(e.target.value)}
                                    placeholder="Studio Address"
                                />
                                <Input
                                    type="text"
                                    defaultValue={studioData.offer}
                                    onChange={(e) => setoffer(e.target.value)}
                                    placeholder="Your Offers"
                                />
                                <TextArea
                                    defaultValue={studioData.description}
                                    onChange={(e) => setdescription(e.target.value)}
                                    placeholder="Best Line for the Guest to Impress and Hire You"
                                />
                            </Form>
                            <br />
                            <Button onClick={handleform} type="primary">Save Changes</Button>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <h3>If you are a photographer, complete the details</h3>
                    <div className="p-4 m-4">
                        <Form onSubmitCapture={handleform}>
                            <Input
                                type="text"
                                onChange={(e) => setname(e.target.value)}
                                placeholder="Your Studio name"
                            />
                            <Input
                                type="number"
                                onChange={(e) => setphone(e.target.value)}
                                maxLength={13}
                                placeholder="Studio Phone No"
                            />
                            <Input
                                type="text"
                                onChange={(e) => setaddress(e.target.value)}
                                placeholder="Studio Address"
                            />
                            <Input
                                type="text"
                                onChange={(e) => setoffer(e.target.value)}
                                placeholder="Your Offers"
                            />
                            <TextArea
                                onChange={(e) => setdescription(e.target.value)}
                                placeholder="Best Line for the Guest to Impress and Hire You"
                            />
                        </Form>
                        <br />
                        <Button onClick={handleform} type="primary">Submit</Button>
                    </div>
                </div>
            )}
        </div>
    );

}

export default Photographer_detail;