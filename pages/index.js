import { useEffect, useState } from "react";

import io from "socket.io-client";

const socket = io("http://localhost:3001");

socket.on("delete-beat", id => {
  setBeats(beats.filter(beat => beat._id !== id));
});

socket.on("update-beat", beat => {
  setBeats(beats.map(b => (b._id === beat._id ? beat : b)));
});

export default function Home() {
  const [editingBeat, setEditingBeat] = useState(null);
  const [beats, setBeats] = useState([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState(null);

  useEffect(() => {
    async function fetchBeats() {
      const response = await fetch("/api/beats");
      const data = await response.json();
      setBeats(data);
    }

    fetchBeats();
  }, []);

  const handleSubmit = async e => {
    // e.preventDefault(); // prevent the form from reloading the page

    // Create a new FormData object and append the file to it
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("price", price);

    // Send the form data to the server using a POST request
    const response = await fetch("/api/beats", {
      method: "POST",
      body: formData,
    });

    // Check the response status and handle the result
    if (response.ok) {
      const newBeat = await response.json();
      setBeats([...beats, newBeat]); // add the new beat to the list
      setName(""); // reset the form fields
      setPrice("");
      setFile(null);
    } else {
      console.error("Error uploading file");
    }
  };

  const handleDelete = async id => {
    await fetch(`/api/beats/${id}`, { method: "DELETE" });
    const response = await fetch("/api/beats");
    const data = await response.json();
    setBeats(data);
  };

  // Edit
  const handleEditSubmit = async e => {
    // e.preventDefault();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name);
    formData.append("price", price);

    const response = await fetch(`/api/beats/${editingBeat._id}`, {
      method: "PUT",
      body: formData,
    });

    if (response.ok) {
      const updatedBeat = await response.json();
      setBeats(
        beats.map(beat => (beat._id === editingBeat._id ? updatedBeat : beat))
      );
      setEditingBeat(null);
      setName("");
      setPrice("");
      setFile(null);
    } else {
      console.error("Error updating beat");
    }
  };

  return (
    <div>
      <h1>Music Beats Store</h1>
      <form className="form" onSubmit={handleSubmit}>
        <label htmlFor="name">Name:</label>
        <input
          className="input"
          type="text"
          id="name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <br />
        <label htmlFor="price">Price:</label>
        <input
          className="input"
          type="text"
          id="price"
          value={price}
          onChange={e => setPrice(e.target.value)}
        />
        <br />
        <label htmlFor="file">File:</label>
        <input
          className="input"
          type="file"
          id="file"
          name="file"
          onChange={e => setFile(e.target.files[0])}
        />
        <br />
        <button className="add-btn" type="submit">
          Add Beat
        </button>
      </form>

      {beats.map(beat => (
        <div className="beats" key={beat._id}>
          <h3>{beat.name}</h3>
          <p>Price: ${beat.price}</p>
          <button className="delete-btn" onClick={() => handleDelete(beat._id)}>
            Delete
          </button>
          <button className="edit-btn" onClick={() => setEditingBeat(beat)}>
            Edit
          </button>
        </div>
      ))}

      {editingBeat ? (
        <form onSubmit={handleEditSubmit}>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name || editingBeat.name}
            onChange={e => setName(e.target.value)}
          />
          <br />
          <label htmlFor="price">Price:</label>
          <input
            type="text"
            id="price"
            value={price || editingBeat.price}
            onChange={e => setPrice(e.target.value)}
          />
          <br />
          <label htmlFor="file">File:</label>
          <input
            type="file"
            id="file"
            name="file"
            value={file || editingBeat.file}
            onChange={e => setFile(e.target.files[0])}
          />
          <br />
          <button className="save-btn" type="submit">
            Save
          </button>
          <button className="cancel-btn" onClick={() => setEditingBeat(null)}>
            Cancel
          </button>
        </form>
      ) : (
        ""
      )}
    </div>
  );
}
