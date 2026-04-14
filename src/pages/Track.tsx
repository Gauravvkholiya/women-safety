import { useEffect, useState } from "react";
import { db } from "../app/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useParams } from "react-router-dom";

const Track = () => {
  const { id } = useParams();
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    if (!id) return;

    console.log("Tracking ID:", id);

    const unsub = onSnapshot(doc(db, "tracking", id), (docSnap) => {
      if (docSnap.exists()) {
        console.log("DATA:", docSnap.data());
        setLocation(docSnap.data());
      } else {
        console.log("No doc found ❌");
      }
    });

    return () => unsub();
  }, [id]);

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <h2 className="text-xl mb-4">Live Tracking</h2>

      {location ? (
        <iframe
          title="map"
          width="90%"
          height="500"
          src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
        />
      ) : (
        <p>Loading location...</p>
      )}
    </div>
  );
};

export default Track;