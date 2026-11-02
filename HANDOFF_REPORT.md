Started with the assignment instructions, then went through SPEC.md, the README, the prompt log, and the code. The spec helped a lot. The main idea—repairing one system puts more stress on another—was easy to understand, so it was pretty clear what needed to stay.



Most of the spec was clear. The controls, repair cycle, failure conditions, and priorities were all explained, and the numbered acceptance criteria were specific enough to check. The confusing part was the numbers. One section said a round should last 60 seconds, while the acceptance criteria said 90. Wasn't clear which one to follow.



The code was pretty easy to navigate. Settings were in config.js, game rules in game.js, and drawing in render.js. The connections between the three stations were also stored directly in the configuration. Changing the round length was straightforward and didn't require rewriting the game.



The main thing that took extra checking was the disagreement between the documents. The README said some settings didn't match the spec, but those settings actually matched the numbered acceptance criteria. Following the README would have changed them in the wrong direction. Also, the existing tests calculated their expected results from the configuration, so passing them didn't necessarily mean the settings matched the spec.



For next time, the biggest improvement would be keeping the spec, acceptance criteria, and README in sync whenever the numbers change. Having one clearly authoritative version would make the project much easier to pick up.

