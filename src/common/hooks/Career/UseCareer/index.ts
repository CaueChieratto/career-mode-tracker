import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import { Career } from "../../../interfaces/Career";
import { auth } from "../../../services/Firebase";
import { ServiceCareer } from "../../../services/ServiceCareer";

export const useCareers = () => {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeCareers: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeCareers) {
        unsubscribeCareers();
        unsubscribeCareers = undefined;
      }

      if (user) {
        setLoading(true);
        unsubscribeCareers = ServiceCareer.getAll((data) => {
          setCareers(data);
          setLoading(false);
        });
      } else {
        setCareers([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeCareers) {
        unsubscribeCareers();
        unsubscribeCareers = undefined;
      }
    };
  }, []);

  return { careers, loading };
};
