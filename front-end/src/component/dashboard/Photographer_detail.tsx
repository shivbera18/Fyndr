import { useEffect, useState } from "react";
import { API_URL } from "../../utils/api";
import { Banner, Field, Reveal } from "../landing/primitives";

export default function Photographer_detail(): React.JSX.Element {
  const [studioName, setStudioName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [address, setAddress] = useState("");
  const [offer, setOffer] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userId = user._id as string | undefined;

  useEffect(() => {
    const fetchStudio = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`${API_URL}/find_studio`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ create_by: userId }),
        });
        const data = await res.json();
        if (data && data.studio_name) {
          setStudioName(data.studio_name || "");
          setPhoneNo(data.phone_no || "");
          setAddress(data.address || "");
          setOffer(data.offer || "");
          setDescription(data.description || "");
        }
      } catch {}
    };

    fetchStudio();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`${API_URL}/studio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studio_name: studioName,
          phone_no: phoneNo,
          address,
          offer,
          description,
          create_by: userId,
        }),
      });

      if (res.ok) {
        setStatus({ kind: "success", text: "Studio profile successfully saved!" });
      } else {
        setStatus({ kind: "error", text: "Failed to save profile." });
      }
    } catch {
      setStatus({ kind: "error", text: "Server connection error." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Reveal>
      <div className="fy-card" style={{ maxWidth: "44rem" }}>
        <h3>Photographer &amp; studio branding</h3>
        <p style={{ marginBottom: "1.25rem" }}>
          This information will be displayed to guests when they access your event galleries and
          scan QR codes.
        </p>

        {status && (
          <div style={{ marginBottom: "1rem" }}>
            <Banner kind={status.kind}>{status.text}</Banner>
          </div>
        )}

        <form className="fy-form" onSubmit={handleSubmit}>
          <Field
            label="Studio or brand name"
            name="studioName"
            value={studioName}
            onChange={setStudioName}
            required
            placeholder="e.g. Apex Visuals & Wedding Cinema"
          />
          <Field
            label="Contact phone / WhatsApp"
            name="phoneNo"
            value={phoneNo}
            onChange={setPhoneNo}
            placeholder="+91 98765 43210"
            autoComplete="tel"
          />
          <Field
            label="Special offers / tagline"
            name="offer"
            value={offer}
            onChange={setOffer}
            placeholder="Book 2026 weddings & get 15% off"
          />
          <Field
            label="Studio location / address"
            name="address"
            value={address}
            onChange={setAddress}
            placeholder="Mumbai, India / Available Worldwide"
            autoComplete="street-address"
          />
          <Field
            label="About your studio"
            name="description"
            value={description}
            onChange={setDescription}
            multiline
            rows={3}
            placeholder="Tell your clients and event guests about your photography experience…"
          />
          <button className="fy-btn fy-btn-default fy-btn-md" type="submit" disabled={loading}>
            {loading ? "Saving…" : "Save studio branding →"}
          </button>
        </form>
      </div>
    </Reveal>
  );
}
