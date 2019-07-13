import AreaEntranceSeparator from "./Constants/AreaEntranceSeparator";
import PromptForInteriorEntrance from "./PromptForInteriorEntrance";
import EntranceTypes from "./DataObjects/EntranceTypes";
import LocalStorage from "./Constants/LocalStorage";
import Areas from "./DataObjects/AreasAndEntrances";
import AreasToAdd from "./DataObjects/AreasToAdd";
import Grottos from "./DataObjects/Grottos";
import Houses from "./DataObjects/Houses";
import Songs from "./DataObjects/Songs";
import Menu from "./DataObjects/Menu";
import React from "react";
import Area from "./Area";
import Song from "./Song";

export default class ZOoTREntranceTracker extends React.Component {

    state = {
        // Interiors that have not yet been assigned
        availableInteriors: {},
        // DataObjects that have not yet been assigned
        availableEntrances: {},
        // Interior keys with an array of their location
        interiorLocations: {},
        // Overworld Area objects that are added to openAreas when found
        availableAreas: {},
        // This tracks all current areas and state involved
        openAreas: {},
        // Songs that the user poses
        songs: {}
    };

    // area: the area that the overworld pointer is located in
    // entrance: the overworld entrance in the area
    // nextAreaAndEntrance: the area->entrance pointer that is the new connection
    setOverworldToOverworld = (area, entrance, nextAreaAndEntrance) => {
        let [nextArea, nextEntrance] = nextAreaAndEntrance.split(AreaEntranceSeparator);
        let currentAreaAndEntrance = `${area}${AreaEntranceSeparator}${entrance}`;

        // add the areas (kinda overkill since one has to be defined already)
        this.addAreaIfNotAvailable(area);
        this.addAreaIfNotAvailable(nextArea);
        this.addAdditionalAreas(nextArea);

        this.addInteriorOrAreaLocation(nextAreaAndEntrance, area);
        this.addInteriorOrAreaLocation(currentAreaAndEntrance, nextArea);

        this.removeElementFromStateArray("availableEntrances", EntranceTypes.Overworld, nextAreaAndEntrance);
        this.removeElementFromStateArray("availableEntrances", EntranceTypes.Overworld, currentAreaAndEntrance);

        this.setEntrance(nextArea, nextEntrance, currentAreaAndEntrance);
        this.setEntrance(area, entrance, nextAreaAndEntrance);
    };

    // area: the area that the entrance is located in
    // entrance: the entrance being assigned and interior
    // interior: the house/dungeon/grotto being assigned to a location
    setInteriorToAreaAndEntrance = (area, entrance, interior) => {
        let type = Areas[area].entrances[entrance].type;

        this.removeElementFromStateArray("availableInteriors", type, interior);
        this.addAreaIfNotAvailable(area);
        this.addAdditionalAreas(interior);

        this.addInteriorOrAreaLocation(`${area}${AreaEntranceSeparator}${entrance}`, interior);

        this.setEntrance(area, entrance, interior);
        this.removeElementFromStateArray("availableEntrances", type, interior);
    };

    // area: the area that the overworld pointer is located in
    // entrance: the overworld entrance in the area
    // landingAreaAndEntrance: the area->entrance pointer that is the new connection
    setKaeporaGaeboraEntrance = (area, entrance, landingAreaAndEntrance) => {
        // next area is the import part
        let [landingArea] = landingAreaAndEntrance.split(AreaEntranceSeparator);
        let currentAreaAndEntrance = `${area}${AreaEntranceSeparator}${entrance}`;

        this.addAreaIfNotAvailable(landingArea);
        this.addAdditionalAreas(landingArea);

        this.addInteriorOrAreaLocation(currentAreaAndEntrance, landingArea);

        this.setEntrance(area, entrance, landingAreaAndEntrance);
    };

    addAdditionalAreas = area => {
        if (AreasToAdd[area] !== undefined) {
            AreasToAdd[area].forEach(area => {
                this.addAreaIfNotAvailable(area);
            })
        }
    };

    // area: the area that the overworld pointer is located in
    // entrance: the overworld entrance in the area, will always be KG
    // landingAreaAndEntrance: the area->entrance pointer that was used
    resetKaeporaGaeboraEntrance = (area, entrance, landingAreaAndEntrance) => {
        let [landingArea] = landingAreaAndEntrance.split(AreaEntranceSeparator);
        let currentAreaAndEntrance = `${area}${AreaEntranceSeparator}${entrance}`;

        // reset kaepora overworld pointer to empty
        let openAreas = this.state.openAreas;
        openAreas[area][entrance] = "";
        this.setState({openAreas: openAreas});

        // remove from interiorLocation array
        this.removeInteriorOrAreaLocation(currentAreaAndEntrance, landingArea);

        this.removeAreaIfEmpty(area);
        this.removeAreaIfEmpty(landingArea);
    };

    // locationPointer: an area->entrance pointer
    // interior: interior name to be used as key for array of pointers
    addInteriorOrAreaLocation = (locationPointer, interior) => {
        let interiorLocations = this.state.interiorLocations;
        if (interiorLocations[interior] === undefined) {
            interiorLocations[interior] = [];
        }
        interiorLocations[interior].push(locationPointer);
        this.setState({interiorLocations: interiorLocations});
    };

    // locationPointer: an area->entrance pointer
    // interior: interior name that is used as key for array of location pointers
    removeInteriorOrAreaLocation = (locationPointer, interior) => {
        let interiorLocations = this.state.interiorLocations;
        interiorLocations[interior].splice(interiorLocations[interior].indexOf(locationPointer), 1);
        if (interiorLocations[interior].length === 0) {
            delete interiorLocations[interior];
        }
        this.setState({interiorLocations: interiorLocations});
    };

    // area: the area the overworld pointer is set in
    // entrance: the entrance it is assigned to
    // nextAreaAndEntrance the area->entrance pointer for where the entrance leads
    resetOverworldEntrance = (area, entrance, connectedAreaAndEntrance) => {
        let [otherArea, otherEntrance] = connectedAreaAndEntrance.split(AreaEntranceSeparator);
        let currentAreaAndEntrance = `${area}${AreaEntranceSeparator}${entrance}`;

        // reset both overworld pointers to empty
        let openAreas = this.state.openAreas;
        openAreas[area][entrance] = "";
        openAreas[otherArea][otherEntrance] = "";
        this.setState({openAreas: openAreas});

        // remove from interiorLocation array
        this.removeInteriorOrAreaLocation(connectedAreaAndEntrance, area);
        this.removeInteriorOrAreaLocation(currentAreaAndEntrance, otherArea);

        // add the freed entrances back into the pool
        let availableEntrances = this.state.availableEntrances;
        availableEntrances[EntranceTypes.Overworld].push(connectedAreaAndEntrance);
        availableEntrances[EntranceTypes.Overworld].push(currentAreaAndEntrance);
        availableEntrances[EntranceTypes.Overworld] = availableEntrances[EntranceTypes.Overworld].sort();
        this.setState({availableEntrances: availableEntrances});

        this.removeAreaIfEmpty(area);
        this.removeAreaIfEmpty(otherArea);
    };

    resetEntrance = (area, entrance, interior) => {
        let openAreas = this.state.openAreas;
        openAreas[area][entrance] = "";
        let type = Areas[area].entrances[entrance].type;

        this.removeInteriorOrAreaLocation(`${area}${AreaEntranceSeparator}${entrance}`, interior);

        let availableInteriors = this.state.availableInteriors;
        availableInteriors[type].push(interior);
        availableInteriors[type] = availableInteriors[type].sort();
        this.setState({availableInteriors: availableInteriors});
        this.setState({openAreas: openAreas});
    };

    removeAreaIfEmpty = areaName => {
        let areas = this.state.openAreas;
        let area = areas[areaName];
        let empty = true;
        if (!area) {
            return;
        }
        Object.keys(area).forEach(entrance => {
            if (area[entrance] !== "") { empty = false; }
        });
        if (empty) {
            delete areas[areaName];
            this.setState({openAreas: areas});
        }
    };

    setEntrance = (area, entrance, interior) => {
        let openAreas = this.state.openAreas;
        openAreas[area][entrance] = interior;
        this.setState({openAreas: openAreas});
    };

    addAreaIfNotAvailable = area => {
        let openAreas = this.state.openAreas;
        if (area in openAreas) {
            // area is already available
            return;
        }
        openAreas[area] = this.state.availableAreas[area];
        // this.setState({openAreas: {}});
        this.setState({openAreas: openAreas});
    };

    removeElementFromStateArray = (array, type, interior) => {
        let indexOfElement = this.state[array][type].indexOf(interior);
        let elements = this.state[array];
        elements[type].splice(indexOfElement, 1);
        this.setState({[array]: elements});
    };

    interiorToPromptForBasedOnState = () => {
        let interiorLocations = this.state.interiorLocations;
        let songs = this.state.songs;
        if (interiorLocations[Houses.LinksHouse] === undefined) {
            return Houses.LinksHouse;
        } else if (interiorLocations[Grottos.DampesGrave] !== undefined &&
                interiorLocations[Houses.Windmill] === undefined) {
            return Houses.Windmill;
        } else if (songs["Prelude of Light"].collected &&
            interiorLocations[Houses.TempleOfTime] === undefined) {
            return Houses.TempleOfTime;
        }
        return null;
    };

    resetHouseInteriorLocation = interior => {
        let interiors = this.state.interiorLocations;
        let availableInteriors = this.state.availableInteriors;
        let openAreas = this.state.openAreas;
        if (!(interior in interiors)) {
            return;
        }
        let [area, entrance] = interiors[interior][0].split(AreaEntranceSeparator);
        openAreas[area][entrance] = "";
        this.setState({openAreas: openAreas});
        delete interiors[interior];
        availableInteriors[EntranceTypes.House].push(interior);
        this.setState({
            interiorLocations: interiors,
            availableInteriors: availableInteriors
        });
        this.removeAreaIfEmpty(area);
    };

    addSong = song => {
        let songs = this.state.songs;
        songs[song.name].collected = true;
        if (song.areaType === EntranceTypes.Overworld) {
            this.addAreaIfNotAvailable(song.area);
        }
        this.setState({songs: songs})
    };

    removeSong = song => {
        let songs = this.state.songs;
        songs[song.name].collected = false;
        if (song.areaType === EntranceTypes.Overworld) {
            this.removeAreaIfEmpty(song.area);
        } else if (song.areaType === EntranceTypes.House) {
            this.resetHouseInteriorLocation(song.area);
        }
        this.setState({songs: songs});
    };

    componentDidMount() {
        this.setupTracker();
        this.loadState();
    };

    setupTracker = () => {
        let availableEntrances = {
            [EntranceTypes.House]: [],
            [EntranceTypes.Overworld]: [],
            [EntranceTypes.Grotto]: [],
            [EntranceTypes.Dungeon]: [],
            [EntranceTypes.KaeporaGaebora]: []
        };

        let availableInteriors = {
            [EntranceTypes.House]: [],
            [EntranceTypes.Overworld]: [],
            [EntranceTypes.Grotto]: [],
            [EntranceTypes.Dungeon]: [],
            [EntranceTypes.KaeporaGaebora]: []
        };

        let availableAreas = {};
        let interiorLocations = {};

        Object.keys(Areas).forEach(area => {
            availableAreas[area] = {};
            Object.keys(Areas[area].entrances).forEach(entrance => {
                let entranceObject = Areas[area].entrances[entrance];
                let type = entranceObject.type;
                let entranceName = `${area}${AreaEntranceSeparator}${entrance}`;
                let interiorName = entranceObject.display || entrance;
                availableEntrances[type].push(entranceName);
                availableInteriors[type].push(interiorName);
                if (type === EntranceTypes.Overworld) {
                    availableEntrances[EntranceTypes.KaeporaGaebora].push(entranceName);
                }
                availableEntrances[type] = availableEntrances[type].sort();
                availableInteriors[type] = availableInteriors[type].sort();
                availableAreas[area][entrance] = "";
            });
        });

        this.setState({
            availableInteriors: availableInteriors,
            availableEntrances: availableEntrances,
            interiorLocations: interiorLocations,
            availableAreas: availableAreas,
            openAreas: {},
            songs: Songs
        });
    };

    saveState = () => {
        let state = this.state;
        localStorage.setItem(LocalStorage.state, JSON.stringify(state));
    };

    loadState = () => {
        let stringState = localStorage.getItem(LocalStorage.state);
        let state = JSON.parse(stringState);
        if (state) {
            this.setState(state);
        }
    };

    resetState = () => {
        localStorage.removeItem(LocalStorage.state);
        this.setupTracker();
    };

    render() {
        let areas = this.state.openAreas;
        let interiorToPromptFor = this.interiorToPromptForBasedOnState();
        let songs = this.state.songs;

        return (
            <div className="zootr-entrance-tracker">
                {/* search section */}
                {/* from a currently active location to another currently active location only */}

                <Menu
                    saveState={this.saveState}
                    resetState={this.resetState}
                />

                <div className="top-padding" />
                <div className="user-prompts">
                    {interiorToPromptFor !== null ?
                        <PromptForInteriorEntrance
                            interiorToPromptFor={interiorToPromptFor}
                            availableEntrances={this.state.availableEntrances.house}
                            resetEntrance={this.resetEntrance}
                            setInteriorToAreaAndEntrance={this.setInteriorToAreaAndEntrance}
                        />
                        : ""
                    }
                </div>

                {/* collection of areas */}
                {/* these contain a list of entrances */}
                {/* these entrances can be linked to entrances in other areas */}
                {/* this triggers another area to be added to the collection */}
                <div className="areas-container is-flex-desktop is-flex-tablet is-multiline flex-wraps">
                    {Object.keys(areas).sort().map((area, i) => {
                        return <Area
                            key={i}
                            area={area}
                            resetEntrance={this.resetEntrance}
                            setOverworldToOverworld={this.setOverworldToOverworld}
                            setInteriorToAreaAndEntrance={this.setInteriorToAreaAndEntrance}
                            availableInteriors={this.state.availableInteriors}
                            availableEntrances={this.state.availableEntrances}
                            resetOverworldEntrance={this.resetOverworldEntrance}
                            resetKaeporaGaeboraEntrance={this.resetKaeporaGaeboraEntrance}
                            setKaeporaGaeboraEntrance={this.setKaeporaGaeboraEntrance}
                            entrances={areas[area]}
                        />
                    })}
                </div>

                <div className="bottom-padding" />

                <div className="songs-container navbar is-fixed-bottom has-background-dark">
                    {Object.keys(songs).map((song, i) => {
                        return <Song
                            key={i}
                            song={songs[song]}
                            addSong={this.addSong}
                            removeSong={this.removeSong}
                        />
                    })}
                </div>
            </div>
        );
    }
}