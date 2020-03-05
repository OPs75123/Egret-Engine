declare namespace EventSystem {
    function on_event(event_code: eEvent, ...params);
}

declare enum eEvent {
    on_particles_done,
    on_particles_stop,
    on_particles_event
}
