import React from 'react';
import InterestFinder from '../../components/InterestModule/InterestFinder';

const InterestAssessment = () => {
    return (
        <div className="pt-6 pb-12">
            {/* The InterestFinder component already handles its own UI container and logic */}
            <InterestFinder />
        </div>
    );
};

export default InterestAssessment;
