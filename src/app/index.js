const {
    checkVideoInfo,
    generateOptions
} = nw.require('../app/lib/files')

const fs = nw.require('fs')
const path = nw.require('path')
const { execSync } = nw.require('child_process')
const __dirname = path.resolve();

const MAX_STEPS = 5

let currentStep = 1
let videoURL = null
let formats = null
let formatId = null
let audioFormatId = null
let selectedFormat = null
let filePath = null
let filename = null
let thumbnailURL = null

const steps = [
    {
        validationButtonId: 'video-url-validation',
        relatedInput: 'youtube-url',
        inputToFIll: 'format-selection',
        validator: async (e, relatedInput, inputToFill) => {
            const SelectElementToFill = document.getElementById(inputToFill)
            const URL = document.getElementById(relatedInput).value
            const URLREgExp = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/
            if (URLREgExp.test(URL)) {
                videoURL = URL
                try {
                    const { modelizedFormats, videoThumbnailURL} = await checkVideoInfo(videoURL)
                    formats = modelizedFormats
                    thumbnailURL = videoThumbnailURL
                    generateOptions(modelizedFormats).forEach(option => {
                        SelectElementToFill.appendChild(option)
                    })
                    nextStep()
                    return true
                } catch(err) {
                    errorMessage('Please make sure the entered URL is from youtube')
                    return false
                }
            }
            errorMessage('Please enter a video URL')
            return false
        }
    },
    {
        validationButtonId: 'format-validation',
        relatedSelect: 'format-selection',
        validator: (e, relatedSelect) => {
            const selectElement = document.getElementById(relatedSelect)
            const selectedIndex = selectElement.selectedIndex
            const selectedOption = selectElement.options[selectedIndex]
            if (selectedOption.value) {
                selectedFormat = selectedOption.data.format
                formatId = selectedOption.value
                if (!selectedFormat.audioOnly)
                    audioFormatId = getAudioFormatId(formats.filter(format => format.audioOnly), selectedFormat.fileFormat)
                nextStep()
                return true
            }
            errorMessage('Please select a valid format for your video extract')
            return false
        }
    },
    {
        validationButtonId: 'path-validation',
        relatedInput: 'folder-path',
        inputTriggerButton: 'path-selection',
        inputToTrigger: 'folder-path-input',
        validator: (e, relatedInput) => {
            if (fs.existsSync(filePath)) {
                nextStep()
                return true
            }
            errorMessage('Please select a valid path to download your file')
            return false
        },
        inputTrigger: (e, inputToTrigger, relatedInput) => {
            const folderInput = document.getElementById(inputToTrigger)
            const pathInput = document.getElementById(relatedInput)
            folderInput.onchange = e => {
                pathInput.value = folderInput.value
                filePath = pathInput.value
            } 
            folderInput.click()
        }
    },
    {
        validationButtonId: 'filename-validation',
        relatedInput: 'filename',
        validator: (e, relatedInput) => {
            filename = document.getElementById(relatedInput).value
            if (filename) {
                setDownloadSummary()
                nextStep()
                return true
            }
            errorMessage('Please enter a name to give to your downloaded file')
        }
    }
]


for (const step of steps) {
    const {
        validationButtonId = null,
        relatedInput = null,
        relatedSelect = null,
        inputTriggerButton = null,
        inputToTrigger = null,
        inputToFIll = null,
        validator = null,
        inputTrigger = null
    } = step                                                      

    if (validationButtonId && validator) {
        const validationButton = document.getElementById(validationButtonId)
        validationButton.onclick = async (e) => {
            const elementToFill = inputToFIll || null
            const relatedField = relatedInput || relatedSelect
            await validator(e, relatedField, elementToFill)
        }
    }
    if (inputTriggerButton && inputToTrigger && inputTrigger) {
        const triggerButton = document.getElementById(inputTriggerButton)
        const relatedField = relatedInput || null
        triggerButton.onclick = (e) => {
            inputTrigger(e, inputToTrigger, relatedField)
        }
    }
}

const nextStep = () => {
    const currentStepElement = document.querySelector('.step-' + currentStep)
    const nextStepElement = document.querySelector('.step-' + (currentStep + 1))

    currentStepElement.classList.remove('show')
    currentStepElement.classList.add('hide')
    nextStepElement.classList.add('show')

    currentStep++;
}

const errorMessage = errMessage => {
    const errorModal = document.getElementById('error-modal')
    errorModal.classList.add('show')
    errorModal.innerHTML = errMessage
    setTimeout(() => {
        errorModal.classList.remove('show')
        errorModal.classList.add('hide')
    }, 3000)
}

const successMessage = sucMessage => {
    const successModal = document.getElementById('success-modal')
    successModal.classList.remove('hide')
    successModal.classList.add('show')
    successModal.innerHTML = sucMessage
    setTimeout(() => {
        successModal.classList.remove('show')
        successModal.classList.add('hide')
    }, 15000)
}

const setDownloadSummary = () => {
    const thumbnailTag = document.querySelector('.summary-thumbnail-image')
    const summaryFilename = document.querySelector('.summary-filename')
    const summaryFormat = document.querySelector('.summary-format')
    const downloadButton = document.getElementById('download-launch')
    downloadButton.onclick = (e) => {
        const downloadWaitingArea = document.getElementById('download-wait')
        downloadWaitingArea.classList.remove('hide')
        downloadWaitingArea.classList.add('show')
        setTimeout(()=> {
            launchDownload()
        }, 1000)
    }
    thumbnailTag.src = thumbnailURL.url
    console.log(filename);
    summaryFilename.innerHTML = `File name : ${filename}`
    summaryFormat.innerHTML = `Selected settings for the download:\n ${selectedFormat.formatMessage}`.replace(/\n/g, "<br />")
}

const launchDownload = e => {
    const downloadWaitingArea = document.getElementById('download-wait')
    let success = true
    try {
        console.log('downloading');
        if (selectedFormat.audioOnly) {
            execSync(path.resolve(__dirname, 'app','bin', 'youtube-dl').concat(' ', `--format=${formatId} --audio-format mp3 -o "${filePath}/${filename}.${selectedFormat.fileFormat}" --encoding utf8 ${videoURL}`))
        } else {
            execSync(path.resolve(__dirname, 'app','bin', 'youtube-dl').concat(' ', `--format=${formatId}+${audioFormatId} --ffmpeg-location "${path.resolve(__dirname, 'app','bin', 'ffmpeg')}" --merge-output-format ${selectedFormat.fileFormat} -o "${filePath}/${filename}.${selectedFormat.fileFormat}" --encoding utf8 ${videoURL}`))
        }
        downloadWaitingArea.classList.remove('show')
        downloadWaitingArea.classList.add('hide')
        successMessage('Your file was downloaded !')
        nw.Shell.showItemInFolder(`${filePath}/${filename}.${selectedFormat.fileFormat}`)
        window.location.reload();
    } catch(e) {
        downloadWaitingArea.classList.remove('show')
        downloadWaitingArea.classList.add('hide')
        console.error(e.message)
        success = false
        errorMessage("An error occured while downloading the file")
    }
    return success
}

const getAudioFormatId = (audioFormats, videoFormat) => {
    let chosenAudioFormat
    const webmAudios = audioFormats
    .filter(audioFormat => audioFormat.fileFormat === 'webm')
    .sort((formatA, formatB) => formatB.fileSizeNumber - formatA.fileSizeNumber)
    const m4aAudios = audioFormats
    .filter(audioFormat => audioFormat.fileFormat === 'm4a')
    .sort((formatA, formatB) => formatB.fileSizeNumber - formatA.fileSizeNumber)
    switch(videoFormat) {
        case 'mp4':
            chosenAudioFormat = m4aAudios[0]
            break
        case 'webm':
            chosenAudioFormat = webmAudios[0]
            break
    }

    return chosenAudioFormat.formatId
}

const sleep = async (milliseconds) => new Promise(res => {
    setTimeout(res(), milliseconds)
})