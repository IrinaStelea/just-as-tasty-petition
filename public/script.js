(function () {
    //FOR FUTURE REFERENCE: make sure the script only works on the petition page (no error about canvas context on the other pages)
    // if (!document.querySelector("#form")) {
    //     return;
    // }

    //responsive canvas size
    let canvas = $("canvas");
    canvas[0].height = window.innerWidth * 0.1;
    canvas[0].width = window.innerWidth * 0.25;
    // console.log("canvas", canvas);

    //canvas context
    let ctx = canvas[0].getContext("2d");
    // console.log("context:\t", ctx);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    let dataURL = null;

    //get the position of the canvas relative to the webpage
    let canvasOffset = canvas.offset();
    let offsetX = canvasOffset.left;
    let offsetY = canvasOffset.top;

    //redefine canvas on window resize
    $(window).resize(function () {
        canvas[0].height = window.innerWidth * 0.1;
        canvas[0].width = window.innerWidth * 0.25;
        //update canvas coordinates
        canvasOffset = canvas.offset();
        offsetX = canvasOffset.left;
        offsetY = canvasOffset.top;
        dataURL = null;
    });

    //get the canvas value on page load
    // const dataURLStart = canvas[0].toDataURL();
    // console.log("canvas value at start", dataURLStart);

    //get canvas position
    // let canvasPos = canvas[0].getBoundingClientRect();
    // let canvasPosX = canvasPos.left;
    // let canvasPosY = canvasPos.top;

    //get the mouse position -- as object
    let mouse = {
        x: 0,
        y: 0,
    };

    //keeping track of last mouse position
    let lastMouse = mouse;

    //variable to track the drawing of the signature
    let signing;

    canvas.on("mousedown", (e) => {
        // console.log("mousedown canvas");
        signing = true;
        lastMouse = getMousePos(e);
    });

    $(document).on("mouseup", (e) => {
        // console.log(
        //     "mouse up target",
        //     e.target,
        //     "event current target",
        //     e.currentTarget
        // );
        if (e.target !== canvas) {
            signing = false;
        }
    });

    canvas.on("mousemove", (e) => {
        // console.log("mousemove on canvas");
        //call the sign function here
        sign();
        mouse = getMousePos(e);
    });

    //function to get the mouse's position
    function getMousePos(event) {
        return {
            x: parseInt(event.clientX - offsetX),
            y: parseInt(event.clientY - offsetY),
        };
    }

    //function to draw the signature
    function sign() {
        if (signing) {
            ctx.moveTo(lastMouse.x, lastMouse.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
            lastMouse = mouse;
            //get the value of the canvas here
            dataURL = canvas[0].toDataURL();
            // console.log("signature value", dataURL);
        }
    }

    // clear signature button
    let clear = $("#clear-signature");
    clear.on("click", (e) => {
        dataURL = null;
        //prevent the click of the button from submitting the form
        e.preventDefault();
        // e.stopPropagation();
        canvas[0].width = canvas[0].width;
        //the code below makes existing signature still linger
        // ctx.clearRect(0, 0, canvas[0].width, canvas[0].height);
    });

    //submit form
    let form = $("#form");
    // console.log("submit button", submit);

    form.on("submit", () => {
        //     // e.stopPropagation();
        //     //get the value of the canvas on submit
        //     // console.log("signature value", dataURL);
        //     //assign the value of the signature to the value of the hidden input field
        $("#signature").val(dataURL);
    });
})();
