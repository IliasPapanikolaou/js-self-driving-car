class Car {
    friction;

    constructor(x, y, width, height, controlType, maxSpead = 3, color="blue") {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        this.speed = 0;
        this.acceleration = 0.2;

        this.maxspeed = maxSpead;
        this.friction = 0.05;

        this.angle = 0;

        this.damaged = false;

        this.useBrain = controlType === "AI";

        if (controlType !== "DUMMY") {
            this.sensor = new Sensor(this);
            this.brain = new NeuralNetwork(
                // Input, hidden layer, output = 4 (forward, left, right, reverse)
                [this.sensor.rayCount, 6, 4]
            );
        }

        this.controls = new Controls(controlType);

        this.img = new Image();
        this.img.src = "car.png";

        this.mask = document.createElement("canvas");
        this.mask.width = width;
        this.mask.height = height;

        const maskCtx = this.mask.getContext("2d");
        this.img.onload = () => {
            maskCtx.fillStyle = color;
            maskCtx.rect(0, 0, this.width, this.height);
            maskCtx.fill();

            maskCtx.globalCompositeOperation = "destination-atop";
            maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
        }
    }

    // Move the car
    update(roadBorders, traffic) {
        if (!this.damaged) {
            this.#move();
            this.polygon = this.#createPolygon();
            this.damaged = this.#assessDamage(roadBorders, traffic);
        }
        if (this.sensor) {
            this.sensor.update(roadBorders, traffic);
            // Receive low values if object is far away and high values close to 1 if it is close.
            const offsets = this.sensor.readings.map(
                s => s === null ? 0 : 1 - s.offset
            )
            const outputs = NeuralNetwork.feedForward(offsets, this.brain);
            // console.log(outputs); // Debugging console

            if (this.useBrain) {
                this.controls.forward = outputs[0];
                this.controls.left = outputs[1];
                this.controls.right = outputs[2];
                this.controls.reverse = outputs[3];
            }
        }
    }

    #assessDamage(roadBorders, traffic) {
        // Road Borders
        for ( let i = 0; i < roadBorders.length; i++) {
            if (polysIntersect(this.polygon, roadBorders[i])) {
                return true;
            }
        }
        // Other Cars
        for ( let i = 0; i < traffic.length; i++) {
            if (polysIntersect(this.polygon, traffic[i].polygon)) {
                return true;
            }
        }
        return  false;
    }

    #createPolygon() {
        const points = [];
        // Get radius using hypot method
        const rad = Math.hypot(this.width, this.height) / 2;
        // Get the angle
        const alpha = Math.atan2(this.width, this.height);

        points.push({
           x:this.x - Math.sin(this.angle - alpha) * rad,
           y:this.y - Math.cos(this.angle - alpha) * rad,
        });
        points.push({
            x:this.x - Math.sin(this.angle + alpha) * rad,
            y:this.y - Math.cos(this.angle + alpha) * rad,
        });
        points.push({
            x:this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y:this.y - Math.cos(Math.PI + this.angle - alpha) * rad,
        });
        points.push({
            x:this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y:this.y - Math.cos(Math.PI + this.angle + alpha) * rad,
        });
        return points;
    }

    // Movement logic
    #move() {
        // Forward and Backward movement
        if (this.controls.forward) {
            this.speed += this.acceleration;
        }
        if (this.controls.reverse) {
            this.speed -= this.acceleration;
        }
        // Reach speed limit
        if (this.speed > this.maxspeed) {
            this.speed = this.maxspeed;
        }
        // Reverse speed limit
        if (this.speed < -this.maxspeed / 2) {
            this.speed = -this.maxspeed / 2;
        }
        // Friction in forward movement - deceleration
        if (this.speed > 0) {
            this.speed -= this.friction;
        }
        // Friction in backwards movement - deceleration
        if (this.speed < 0) {
            this.speed += this.friction;
        }
        // Stop the car if speed is less than the friction
        if (Math.abs(this.speed) < this.friction) {
            this.speed = 0;
        }
        // Left and Right turn movement
        // Box2D is a library for 2D object movement
        if (this.speed !== 0) {
            const flip = this.speed > 0 ? 1 : -1;
            if (this.controls.left) {
                this.angle += 0.03 * flip;
            }
            if (this.controls.right) {
                this.angle -= 0.03 * flip;
            }
        }
        // Car moves to the direction of the turn
        this.x -= Math.sin(this.angle) * this.speed; // Second step
        this.y -= Math.cos(this.angle) * this.speed; // Second step
        // this.y -= this.speed; // Step one
    }

    // ctx stands for context
    draw(ctx, color, drawSensor = false) {
        // // 2. Second Step: rotation implementation
        // ctx.save();
        // ctx.translate(this.x, this.y);
        // ctx.rotate(-this.angle);
        // // 1. First Step
        // ctx.beginPath();
        // ctx.rect(
        //     // this.x - this.width/2, // First Step
        //     // this.y - this.height/2, // First Step
        //     -this.width / 2, // Second Step
        //     -this.height / 2, // Second Step
        //     this.width,
        //     this.height
        // );
        // ctx.fill();
        // ctx.restore(); // Second Step

        // 3. Third step - createPolygon() method
        // if (this.damaged) {
        //     ctx.fillStyle = "grey";
        // } else {
        //     ctx.fillStyle = color;
        // }
        // ctx.beginPath();
        // ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
        // for (let i = 1; i < this.polygon.length; i++) {
        //     ctx.lineTo(this.polygon[i].x, this.polygon[i].y)
        // }
        // ctx.fill();

        // draw the sensor as well
        if (this.sensor && drawSensor) {
            this.sensor.draw(ctx);
        }

        // 4. Fourth method: car.png
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(-this.angle);
        if (!this.damaged) {
            ctx.drawImage(this.mask, -this.width / 2, -this.height / 2, this.width, this.height);
        }
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}