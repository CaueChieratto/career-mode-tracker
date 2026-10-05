import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import { Career } from "../../../interfaces/Career";
import { auth } from "../../../services/Firebase";
import { ServiceCareer } from "../../../services/ServiceCareer";

type CareerUpdater = (prevCareers: Career[]) => Career[];
const careerUpdaters = new Set<(updater: CareerUpdater) => void>();

export const notifyCareersUpdated = (updater: CareerUpdater): void => {
  careerUpdaters.forEach((cb) => cb(updater));
};

export const useCareers = () => {
  const [careers, setCareers] = useState<Career[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleUpdate = (updater: CareerUpdater) => {
      setCareers((prev) => updater(prev));
    };
    careerUpdaters.add(handleUpdate);
    return () => {
      careerUpdaters.delete(handleUpdate);
    };
  }, []);

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
