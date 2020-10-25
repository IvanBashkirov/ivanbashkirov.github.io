---
layout: post
title:  "Nektar Pacer with Ableton Live"
permalink: nektar-pacer-script
---

Recently I bought Nektar Pacer - a highly programmable MIDI Foot controller designed to work with
a multitude of MIDI supporting software and hardware. My primary use case was using it with Ableton Live. While controlling Live is possible out of the box, the functionality you get is quite limited - Play/Stop/Record transport controls, Next/Previous track, Loop activation, Rewind/Fast forward. This was not very useful for me as I was planning to use the foot controller to switch between individual clips and have the ability to solo/mute/arm currently selected tracks. Not only these functions didn't have readily available mappings in Nektar, Ableton also doesn't make them available for manual MIDI mapping.

### Ableton Control Surface script

If you use a MIDI controller with Ableton Live you probably know that the best way to do it is with the help of a dedicated Control Surface script. Using a CS script allows for tighter controller/DAW integration and means you don't need to do any manual MIDI assignment. Control Surface scripts can also access extra functionality, not available for MIDI mapping.

Nektar Pacer doesn't come with a script like that, so after a week of trying different workarounds I decided to write it. The result can be found [here](https://github.com/IvanBashkirov/Ableton-Live-MIDI-Remote-Scripts/tree/Nektar_Pacer). It allows you to switch between tracks, switch between scenes, arm solo and mute individual tracks, launch individual clips, stop all clips on a selected track and toggle MIDI overdub. It also takes advantage of Pacer's highly programmable LEDs so all buttons have LED feedback. The repository includes the Ableton Remote MIDI script, a Pacer preset to go with it and detailed instructions on how to set it up.

The script is building on some incredible work done by [laidlaw42](https://github.com/laidlaw42/Ableton-Live-MIDI-Remote-Scripts) and [Hanz Petrov](http://remotescripts.blogspot.com/). If you want to know more about writing Control Surface scripts for Ableton I highly recommend checking them out.

Nektar Pacer is a case of a really good product with poor documentation. I'm glad I stuck with it and managed to figure it out. Hopefully this script will make it a bit easier for someone else.
